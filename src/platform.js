// Platform layer: the only place that talks to native iOS services.
// The game calls window.Platform; in a plain browser (the web prototype) Platform.native is false
// and the game keeps its own demo ads and demo purchases.
//
// Bundled by tools/build.mjs (esbuild) into www/platform.js.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import {
  AdMob, AdmobConsentStatus, BannerAdPosition, BannerAdSize,
  InterstitialAdPluginEvents, RewardAdPluginEvents, BannerAdPluginEvents,
} from '@capacitor-community/admob';
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
import { FirebaseRemoteConfig, GetValueSource } from '@capacitor-firebase/remote-config';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
// eslint-disable-next-line no-undef
const ENV = __APP_ENV__;            // injected by tools/build.mjs from src/env.json

const native = Capacitor.isNativePlatform();
const log = (...a) => { if (ENV.debug) console.log('[Platform]', ...a); };
const safe = async (label, fn, fallback) => { try { return await fn(); } catch (e) { log(label, e && (e.message || e)); return fallback; } };

/* ---------------- storage ----------------
   The game keeps reading/writing localStorage synchronously. On iOS, WKWebView storage can be
   purged under disk pressure, so every write is mirrored into Preferences (UserDefaults) and
   restored into localStorage before the game starts. */
const STORE_PREFIX = 'pourSort:';
async function restoreStorage() {
  const { keys } = await Preferences.keys();
  for (const k of keys.filter(k => k.startsWith(STORE_PREFIX))) {
    const { value } = await Preferences.get({ key: k });
    if (value !== null) { try { localStorage.setItem(k, value); } catch (e) { /* storage full */ } }
  }
}
function persist(key, value) {
  if (!native) return;
  Preferences.set({ key: STORE_PREFIX + key, value }).catch(() => {});
}

/* ---------------- haptics ---------------- */
function haptic(kind) {
  if (!native) return false;
  if (kind === 'success') Haptics.notification({ type: NotificationType.Success }).catch(() => {});
  else if (kind === 'warning') Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
  else if (kind === 'error') Haptics.notification({ type: NotificationType.Error }).catch(() => {});
  else Haptics.impact({ style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light }).catch(() => {});
  return true;
}

/* ---------------- analytics ---------------- */
function track(name, params = {}) {
  log('event', name, params);
  if (!native) return;
  // Firebase: event names ≤ 40 chars, params are strings or numbers
  const clean = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    clean[k] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
  }
  FirebaseAnalytics.logEvent({ name, params: clean }).catch(() => {});
}
function setUserProperty(key, value) {
  if (!native) return;
  FirebaseAnalytics.setUserProperty({ key, value: String(value) }).catch(() => {});
}

/* ---------------- remote config ----------------
   Any numeric key of the game's CFG can be overridden from the Firebase console without an app update. */
const remote = {};
async function loadRemoteConfig(keys) {
  await FirebaseRemoteConfig.setSettings({ fetchTimeoutInSeconds: 6, minimumFetchIntervalInSeconds: ENV.debug ? 0 : 3600 });
  await FirebaseRemoteConfig.fetchAndActivate();
  for (const key of keys) {
    const r = await safe('rc ' + key, () => FirebaseRemoteConfig.getNumber({ key }), null);
    if (r && r.source === GetValueSource.Remote) remote[key] = r.value;
  }
}

/* ---------------- ads ---------------- */
const AD_UNITS = ENV.admob;
const ads = {
  enabled: native && !!AD_UNITS,
  testing: !!(AD_UNITS && AD_UNITS.testing),
  loaded: { inter: false, reward: false },
  rewardEarned: false,
  bannerShown: false,
  bannerHeight: 0,
  waiters: {},
};

async function initAds() {
  if (!ads.enabled) return;
  await AdMob.initialize({ initializeForTesting: ads.testing, tagForChildDirectedTreatment: false });

  // EEA / UK / CH consent (Google-certified CMP: UMP)
  const info = await safe('consent', () => AdMob.requestConsentInfo(), null);
  if (info && info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
    await safe('consent form', () => AdMob.showConsentForm());
  }

  AdMob.addListener(InterstitialAdPluginEvents.Loaded, () => { ads.loaded.inter = true; });
  AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, () => { ads.loaded.inter = false; setTimeout(loadInter, 30000); });
  AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => { ads.loaded.inter = false; finish('inter', true); loadInter(); });
  AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => { ads.loaded.inter = false; finish('inter', false); loadInter(); });
  AdMob.addListener(InterstitialAdPluginEvents.AdImpression, (d) => trackRevenue('interstitial', d));

  AdMob.addListener(RewardAdPluginEvents.Loaded, () => { ads.loaded.reward = true; });
  AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => { ads.loaded.reward = false; setTimeout(loadReward, 30000); });
  AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { ads.rewardEarned = true; });
  AdMob.addListener(RewardAdPluginEvents.Dismissed, () => { ads.loaded.reward = false; finish('reward', ads.rewardEarned); loadReward(); });
  AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => { ads.loaded.reward = false; finish('reward', false); loadReward(); });
  AdMob.addListener(RewardAdPluginEvents.AdImpression, (d) => trackRevenue('rewarded', d));

  AdMob.addListener(BannerAdPluginEvents.SizeChanged, (s) => {
    ads.bannerHeight = s && s.height ? s.height : 0;
    document.documentElement.style.setProperty('--native-banner-h', ads.bannerHeight + 'px');
  });
  AdMob.addListener(BannerAdPluginEvents.AdImpression, (d) => trackRevenue('banner', d));

  loadInter();
  loadReward();
}
function trackRevenue(format, d) {
  // ad_impression with value lets Firebase / BigQuery compute ad revenue per player
  if (!d) return track('ad_impression', { ad_format: format });
  const value = typeof d.valueMicros === 'number' ? d.valueMicros / 1e6 : d.value;
  track('ad_impression', { ad_platform: 'admob', ad_format: format, value, currency: d.currencyCode || 'USD', ad_source: d.networkName });
}
function loadInter() { if (ads.enabled) safe('load inter', () => AdMob.prepareInterstitial({ adId: AD_UNITS.interstitial, isTesting: ads.testing })); }
function loadReward() { if (ads.enabled) safe('load reward', () => AdMob.prepareRewardVideoAd({ adId: AD_UNITS.rewarded, isTesting: ads.testing })); }
function finish(kind, ok) { const w = ads.waiters[kind]; ads.waiters[kind] = null; if (w) w(ok); }
function waitFor(kind) { return new Promise((resolve) => { ads.waiters[kind] = resolve; }); }

const adsApi = {
  get enabled() { return ads.enabled; },
  isReady(kind) { return ads.enabled && !!ads.loaded[kind === 'inter' ? 'inter' : 'reward']; },
  async showInterstitial() {
    if (!adsApi.isReady('inter')) return false;
    const done = waitFor('inter');
    const ok = await safe('show inter', async () => { await AdMob.showInterstitial(); return true; }, false);
    if (!ok) { finish('inter', false); }
    return done;
  },
  async showRewarded() {
    if (!adsApi.isReady('reward')) return false;
    ads.rewardEarned = false;
    const done = waitFor('reward');
    const ok = await safe('show reward', async () => { await AdMob.showRewardVideoAd(); return true; }, false);
    if (!ok) { finish('reward', false); }
    return done;
  },
  async showBanner() {
    if (!ads.enabled || ads.bannerShown) return;
    ads.bannerShown = true;
    await safe('banner', () => AdMob.showBanner({ adId: AD_UNITS.banner, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.BOTTOM_CENTER, margin: 0, isTesting: ads.testing }));
  },
  async hideBanner() {
    if (!ads.bannerShown) return;
    ads.bannerShown = false;
    await safe('hide banner', () => AdMob.removeBanner());
    document.documentElement.style.setProperty('--native-banner-h', '0px');
  },
  async askTracking() {
    if (!ads.enabled) return;
    const st = await safe('att status', () => AdMob.trackingAuthorizationStatus(), null);
    if (st && st.status === 'notDetermined') await safe('att', () => AdMob.requestTrackingAuthorization());
  },
  async privacyOptions() { if (ads.enabled) await safe('privacy options', () => AdMob.showPrivacyOptionsForm()); },
};

/* ---------------- purchases ---------------- */
// App Store Connect product IDs. What each one gives is decided by the game (SHOP_ITEMS in src/parts/shop.js).
const PRODUCTS = {
  noads: { type: 'nonconsumable' },
  coins_500: { type: 'consumable' },
  coins_1500: { type: 'consumable' },
  coins_5000: { type: 'consumable' },
  starter_pack: { type: 'consumable' },      // once per player: the game hides it after the purchase
  lab_pack: { type: 'consumable' },
  scientist_pack: { type: 'consumable' },
  professor_pack: { type: 'consumable' },
  piggy_bank: { type: 'consumable' },
};
const iap = { prices: {}, meta: {}, owned: new Set(), ready: false };
async function initIap() {
  if (!native) return;
  const res = await safe('products', () => NativePurchases.getProducts({ productIdentifiers: Object.keys(PRODUCTS), productType: PURCHASE_TYPE.INAPP }), null);
  if (res && res.products) for (const p of res.products) {
    iap.prices[p.identifier] = p.priceString;
    iap.meta[p.identifier] = { value: typeof p.price === 'number' ? p.price : undefined, currency: p.currencyCode };
  }
  await refreshOwned();
  iap.ready = true;
}
async function refreshOwned() {
  const res = await safe('purchases', () => NativePurchases.getPurchases({ productType: PURCHASE_TYPE.INAPP }), null);
  const list = (res && (res.purchases || res.transactions)) || [];
  for (const t of list) if (t && t.productIdentifier && PRODUCTS[t.productIdentifier] && PRODUCTS[t.productIdentifier].type === 'nonconsumable') iap.owned.add(t.productIdentifier);
}
const iapApi = {
  get available() { return native; },
  price(id) { return iap.prices[id] || null; },
  owns(id) { return iap.owned.has(id); },
  meta(id) { return iap.meta[id] || null; },
  products: PRODUCTS,
  // resolves to the transaction when the purchase went through, otherwise null; the game logs the 'purchase' event
  async buy(id) {
    if (!native) return null;
    const tx = await safe('buy ' + id, () => NativePurchases.purchaseProduct({ productIdentifier: id, productType: PURCHASE_TYPE.INAPP, quantity: 1 }), null);
    if (!tx) return null;
    if (PRODUCTS[id] && PRODUCTS[id].type === 'nonconsumable') iap.owned.add(id);
    return tx;
  },
  async restore() {
    if (!native) return [];
    await safe('restore', () => NativePurchases.restorePurchases());
    await refreshOwned();
    return [...iap.owned];
  },
};

/* ---------------- boot ---------------- */
let readyResolve;
const ready = new Promise((r) => { readyResolve = r; });

async function init(cfgKeys) {
  if (!native) { readyResolve(); return; }
  await safe('status bar', () => StatusBar.setStyle({ style: Style.Dark }));
  await safe('storage', restoreStorage);
  await safe('remote config', () => loadRemoteConfig(cfgKeys || []));
  readyResolve();                         // the game can start now; the rest loads in the background
  safe('splash', () => SplashScreen.hide());
  safe('iap', initIap);
  safe('ads', initAds);
  App.addListener('appStateChange', ({ isActive }) => {
    window.dispatchEvent(new CustomEvent(isActive ? 'platform:resume' : 'platform:pause'));
  });
}

window.Platform = {
  native,
  init,
  ready,
  remote,
  persist,
  haptic,
  track,
  setUserProperty,
  ads: adsApi,
  iap: iapApi,
  env: ENV,
};

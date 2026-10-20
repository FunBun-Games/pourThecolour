# Colour Sort Puzzle

Гібрид-казуальна головоломка «сортування кольорів» для iOS: HTML5-гра в обгортці Capacitor 8, реклама AdMob, покупки StoreKit, аналітика й віддалені налаштування Firebase, хмарна збірка Codemagic (Mac не потрібен).

## Що де лежить

| Шлях | Що це |
| --- | --- |
| `src/game.html` | Уся гра: розмітка, стилі, логіка. Один файл, без фреймворків |
| `src/parts/` | Світи (фони, `biomes.js`), екрани: головний, мапа рівнів, картка перед рівнем (`screens.js`), бустери в запасі, подарунки й вікно глухого кута з солвером (`boosters.js`). Вставляються в гру під час збірки |
| `src/platform.js` | Шар платформи: реклама, покупки, аналітика, remote config, вібрація, збереження. У браузері вимкнений — гра показує демо-рекламу й демо-покупки |
| `src/env.json` | Ідентифікатори реклами (зараз — тестові Google) і прапорець `debug` |
| `levels/levels.json` | 500 рівнів. Кожен перевірений солвером; `minMoves` — точний мінімум ходів |
| `tools/levels/` | Генератори рівнів і солвер |
| `tools/build.mjs` | Збирає `www/` (застосунок) і `dist/prototype.html` (веб-прототип) |
| `tools/check-levels.mjs` | Швидка перевірка рівнів перед збіркою |
| `tools/qa-stage1.mjs` | Бот Playwright етапу 1: глухий кут (кульки й рідина), подарунки, монети, нестача монет, реклама, запас, рестарт, солвер; скріншоти в `qa-out/stage1/` |
| `ios/` | Xcode-проєкт (Swift Package Manager). Портретна орієнтація, лише iPhone |
| `codemagic.yaml` | Хмарна збірка → TestFlight |
| `docs/privacy/` | Політика конфіденційності (публікується через GitHub Pages) |
| `store/` | Тексти для App Store, іконка, скріншоти 1320×2868 |

## Команди

```bash
npm ci                         # залежності
npm run build                  # debug-збірка www/ + веб-прототип
node tools/build.mjs --release # release: без інструментів тестувальника
npx cap sync ios               # скопіювати гру в iOS-проєкт
npm test                       # перевірити рівні
node tools/qa-stage1.mjs       # бот етапу 1 (після npm run build)
```

## Віддалені налаштування (без оновлення застосунку)

У Firebase Remote Config можна перевизначити будь-яке число з `CFG` у `src/game.html`, наприклад:
`adX` (ціна порятунку; бонуси ¾X і ½X рахуються від нього), `interFrom`, `interEvery`, `interAlwaysFrom`, `bannerFrom`, `timedFrom`, `timeFactor`, `timeFactorHard`, `reviveSecs`, `freeUndos`, `startCoins`, `variantSplit` (частка гравців з рідиною), `askTrackingAfter`, `musicVol`, `preBoostFrom` (з якого рівня пропонувати бонус на старт), `preBoostDiscount` (знижка на бонус на старт, 0.25 = −25%).

Етап 1 (бустери й глухий кут): `undoPack` (скільки скасувань дає одна покупка), `maxExtra` (додаткових пробірок на рівень), `stuckDelay` (мс до вікна «Ходів більше немає»), `stuckSolverMax` / `stuckSolverMs` / `stuckSolverTubes` (межі пошуку раннього глухого кута; `stuckSolverMax: 0` вимикає), `giftTube`, `giftUndo`, `giftUndoFrom`, `giftTime` (подарунки). Ціни пробірки, скасувань і «+30 с» = `adX`.

## Події аналітики

`level_start`, `level_complete`, `level_fail`, `level_restart`, `revive`, `coins_spent`, `ad_offer_accepted`, `ad_watched`, `ad_impression` (з доходом), `purchase`, `map_open`, `level_quit`, `pre_boost`, `music_toggle`,
`stuck_offer` (level, how: coins / ad / stock / gift / shop / undo / restart / dismiss, kind: dead / early, gift, extra), `booster_use` (type: undo / tube / time, method: coins / ad / stock / gift, level), `booster_gift` (type, level, count). Властивість гравця: `look_variant` (balls / liquid).

## Запуск: кроки по порядку

1. **Apple Developer Program** — особистий акаунт, $99 на рік.
2. **App Store Connect → My Apps → +** — нова iOS-апка: назва, мова English (U.S.), Bundle ID `com.funbungames.coloursort`, SKU `coloursort`. Потім: Agreements, Tax and Banking (Paid Apps), і три покупки з `store/listing.md`.
3. **Ключ для Codemagic** — App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → «+», роль App Manager. Завантажити `.p8`, записати Issuer ID і Key ID.
4. **GitHub** — репозиторій з цим кодом; Settings → Pages → гілка `main`, папка `/docs`. Політика: https://kostiantynsherman-jpg.github.io/pourThecolour/privacy/ (FunBun Games, funbun.dev@gmail.com).
5. **Codemagic** — увійти через GitHub, додати репозиторій. Teams → Integrations → Developer Portal → ключ із кроку 3, назва `FunBun ASC`. У `codemagic.yaml` вписати `APP_STORE_APPLE_ID`. Запустити збірку `ios-testflight` вручну.
6. **TestFlight** — встановити TestFlight на iPhone; збірка з'явиться там.
7. **Firebase** — новий проєкт, iOS-застосунок з Bundle ID `com.funbungames.coloursort`, завантажити `GoogleService-Info.plist`, закодувати в base64 і додати в Codemagic як `GOOGLE_SERVICE_INFO_PLIST_B64` (група `firebase`). В Analytics → Data retention поставити 14 місяців.
8. **AdMob** — нова iOS-апка, три рекламні блоки (Banner, Interstitial, Rewarded), у Privacy & messaging створити повідомлення GDPR і IDFA. Ідентифікатори — в Codemagic, група `admob`: `ADMOB_APP_ID`, `ADMOB_BANNER_ID`, `ADMOB_INTERSTITIAL_ID`, `ADMOB_REWARDED_ID`.
9. **Перед подачею на перевірку** — додати всі SKAdNetwork-ідентифікатори Google у `ios/App/App/Info.plist` (зараз там лише власний ідентифікатор Google), заповнити App Privacy за `store/listing.md`, завантажити скріншоти зі `store/screenshots/`.

Без кроків 7–8 збірка теж працює: тоді вмикається тестова реклама Google, а аналітика вимкнена.

## Що перевірити першим у TestFlight

- Звук не зникає після покупок і реклами (на iPhone у браузері був такий баг).
- Банер знизу не перекриває кнопки і не ховається під смугою «додому».
- Вібрація відчувається на ходах і перемогах.
- Таймер зупиняється, коли застосунок згорнутий.

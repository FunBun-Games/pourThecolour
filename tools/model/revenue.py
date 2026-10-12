"""Revenue model for 100 iOS installs of Colour Sort Puzzle.
Simulates players day by day (retention), levels played, and the ads the game actually shows by its rules.
All inputs are assumptions from public benchmarks; change them at the top."""
import random, json, sys

# --- market assumptions (iOS, Tier-1: US / CA / AU) ---
ECPM = {"rewarded": 18.0, "inter": 14.0, "banner": 0.8}   # USD per 1000 impressions
FILL = 0.92                                                 # share of ad requests that get an ad
APPLE_CUT = 0.15                                            # Small Business Program
NOADS_PRICE = 4.99
SUB_PRICE = 2.99                                            # hypothetical monthly "no ads" subscription

# --- player behaviour ---
D1, D7 = 0.35, 0.12                                         # our soft-launch gates
B = __import__("math").log(D1 / D7) / __import__("math").log(7)
def ret(d): return 1.0 if d == 0 else D1 * d ** (-B)       # power-law retention curve
LEVELS_DAY0, LEVELS_LATER = 10, 7
MIN_PER_LEVEL = lambda lvl: 1.0 if lvl < 15 else 1.8        # minutes per level
BANNER_REFRESH_MIN = 1.0
RESCUES_PER_LEVEL = lambda lvl: 0.0 if lvl < 15 else 0.35   # chances to watch a rescue ad (tube / time)

# --- game ad rules (from CFG) ---
def inter_after(lvl, since):          # returns (show?, new_since)
    if lvl < 12: return False, since
    since += 1
    every = 1 if lvl >= 30 else 2
    return (since >= every), (0 if since >= every else since)

def simulate(scenario, max_levels, days=30, n=20000, seed=7):
    rnd = random.Random(seed)
    tot = {"inter": 0, "banner": 0, "rewarded": 0, "levels": 0, "active_days": 0}
    for _ in range(n):
        lvl, since, alive = 0, 0, True
        for d in range(days):
            if d > 0:
                p = ret(d) / ret(d - 1)
                if rnd.random() > p: break
            tot["active_days"] += 1
            todo = LEVELS_DAY0 if d == 0 else LEVELS_LATER
            for _ in range(todo):
                if lvl >= max_levels: break
                lvl += 1; tot["levels"] += 1
                noads = scenario in ("noads", "sub", "sub_plus")
                if not noads:
                    show, since = inter_after(lvl, since)
                    if show: tot["inter"] += FILL
                    if lvl >= 20: tot["banner"] += MIN_PER_LEVEL(lvl) / BANNER_REFRESH_MIN * FILL
                if scenario in ("all_ads", "sub_plus"):
                    tot["rewarded"] += 1.0 * FILL                         # +¾X after every win
                    tot["rewarded"] += RESCUES_PER_LEVEL(lvl) * FILL     # rescue ads
    per = {k: v / n for k, v in tot.items()}
    ad = (per["inter"] * ECPM["inter"] + per["banner"] * ECPM["banner"] + per["rewarded"] * ECPM["rewarded"]) / 1000
    iap = 0.0
    if scenario == "noads": iap = NOADS_PRICE * (1 - APPLE_CUT)
    if scenario in ("sub", "sub_plus"):
        # month 1 paid by all subscribers; 60% renew for month 2, 45% are still paying in month 3
        payments = 1 + (0.60 if days > 31 else 0) + (0.45 if days > 61 else 0)
        iap = SUB_PRICE * (1 - APPLE_CUT) * payments
    return per, ad, iap

out = {}
for cap in (50, 500):
    for days in (30, 90):
        for sc in ("forced", "all_ads", "noads", "sub", "sub_plus"):
            per, ad, iap = simulate(sc, cap, days)
            out[f"{sc}|{cap}|{days}"] = {"levels": round(per["levels"], 1), "active_days": round(per["active_days"], 2),
                "inter": round(per["inter"], 1), "banner": round(per["banner"], 1), "rewarded": round(per["rewarded"], 1),
                "ads_per_100": round(ad * 100, 2), "iap_per_100": round(iap * 100, 2), "total_per_100": round((ad + iap) * 100, 2)}
json.dump(out, sys.stdout, ensure_ascii=False, indent=1)

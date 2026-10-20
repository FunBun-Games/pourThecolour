# App Store listing — draft

Language of the store page: English (U.S.) first; the soft launch runs in Canada, Australia and New Zealand.

## Name (≤ 30)
**Colour Sort Puzzle** (18 characters). Home-screen name under the icon: **Colour Sort**.
Developer / seller: FunBun Games. Support: funbun.dev@gmail.com.

If App Store Connect says the name is taken, fall back to **Colour Sort Puzzle: Pour** or **Colour Sort Puzzle: Rivals**.

## Subtitle (≤ 30)
Sort colors. Beat the record.

## Keywords (≤ 100, comma-separated, no spaces after commas, no words already in the name)
"color" is the US spelling — the name already covers "colour", "sort" and "puzzle".
color,ball,water,liquid,tube,pour,brain,logic,relax,match,offline,boss,timer,rival,mind,iq,bottle

## Promotional text (≤ 170, can change without review)
New: locked tubes and hidden balls! Pour, sort and beat each level's record in fewer moves — then try the boss levels.

## Description
Pour, sort and beat the record.

Tap a tube, tap another, and watch the colors pour across. Fill every tube with a single color to clear the level. Easy to learn, surprisingly hard to master.

WHY YOU'LL KEEP PLAYING
• Beat the record — every level has a rival's best score in moves and time. Match it for two stars, beat the clock for three.
• Boss levels — every fifth level turns red. Fewer chances, bigger rewards.
• Locked tubes — collect the key color to open them.
• Hidden balls — some colors stay secret until they reach the top.
• Timed levels — race the countdown on later stages.
• Balls or liquid — two looks, same satisfying sort.
• Calm sounds and gentle haptics.

FAIR TO PLAY
• Undo, extra tubes and more time when you need them.
• Play offline.
• Remove ads with a single purchase.

## What's New (first version)
First release. 500 levels, boss stages, locked tubes and hidden balls.

## Category
Primary: Games → Puzzle. Secondary: Games → Casual.

## Age rating answers (expected result 4+)
All content questions: None. Unrestricted web access: No. Gambling / contests: No. Made for Kids: No (general audience).

## In-app purchases to create (App Store Connect → Monetization → In-App Purchases)

| Product ID | Type | Reference name | Price |
| --- | --- | --- | --- |
| `noads` | Non-consumable | Remove ads | $4.99 |
| `coins_500` | Consumable | 500 coins | $1.99 |
| `coins_1500` | Consumable | 1500 coins | $4.99 |
| `coins_5000` | Consumable | 5000 coins | $12.99 |
| `starter_pack` | Consumable | Starter Pack | $1.99 |
| `lab_pack` | Consumable | Lab Pack | $4.99 |
| `scientist_pack` | Consumable | Scientist Pack | $9.99 |
| `professor_pack` | Consumable | Professor Pack | $19.99 |
| `piggy_bank` | Consumable | Piggy Bank | $4.99 |

The starter pack is a consumable that the game offers only once per player (Apple has no "buy once" consumable; a non-consumable would be restorable over and over). Review screenshot for every item: the in-game shop (`qa-out/stage2/02-shop-top.png` / `03-shop-bottom.png` after `node tools/qa-stage2.mjs`).

Display name (≤ 35 characters) and description (≤ 55 characters) for each localization:

| Product ID | EN name | EN description | UK name | UK description |
| --- | --- | --- | --- | --- |
| `noads` | Remove Ads | No ads between levels and no banner. | Без реклами | Без реклами між рівнями і без банера. |
| `coins_500` | 500 Coins | A small bag of coins for boosters. | 500 монет | Невеликий запас монет на бустери. |
| `coins_1500` | 1,500 Coins | A pouch of coins for boosters. | 1500 монет | Мішечок монет на бустери. |
| `coins_5000` | 5,000 Coins | A chest of coins — the best value. | 5000 монет | Скриня монет — найвигідніше. |
| `starter_pack` | Starter Pack | 500 coins, 2 tubes, 3 undos, 2 × +30 s. | Стартовий набір | 500 монет, 2 пробірки, 3 скасування, 2 × +30 с. |
| `lab_pack` | Lab Pack | 1,500 coins, 3 tubes, 5 undos, 3 × +30 s. | Набір лаборанта | 1500 монет, 3 пробірки, 5 скасувань, 3 × +30 с. |
| `scientist_pack` | Scientist Pack | 4,000 coins, 8 tubes, 10 undos, 8 × +30 s. | Набір науковця | 4000 монет, 8 пробірок, 10 скасувань, 8 × +30 с. |
| `professor_pack` | Professor Pack | 10,000 coins, 20 tubes, 25 undos, 20 × +30 s. | Набір професора | 10000 монет, 20 пробірок, 25 скасувань, 20 × +30 с. |
| `piggy_bank` | Piggy Bank | Break it: get every coin your wins saved up. | Скарбничка | Розбийте: усі монети, що зібрали перемоги. |

Note for review (piggy bank): every win adds coins to the piggy bank (10 + 2 per star, up to 3,000); from 1,000 coins it can be broken with this purchase and all collected coins go to the player. The amount is always shown before the purchase.

## App Privacy ("nutrition label") answers

Data used to track you:
- Identifiers → Device ID (advertising identifier, only with permission)
- Usage Data → Advertising Data

Data not linked to you:
- Usage Data → Product Interaction (analytics)
- Purchases → Purchase History (app functionality, analytics)
- Diagnostics → Crash Data, Performance Data (app functionality)
- Identifiers → Device ID (analytics, third-party advertising)

Contact info, location, health, user content: not collected.

## Notes for App Review
The game has no account or login. In-app purchases are in the Shop tab at the bottom of the home screen (also: the "+" next to the coins, and Settings → Open the shop); "Restore purchases" is at the bottom of the shop. Ads use Google AdMob; the tracking prompt appears after level 2.

## Screenshots
6.9" iPhone, 1320 × 2868 — see `store/screenshots/`.

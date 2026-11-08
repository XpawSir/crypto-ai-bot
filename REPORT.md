# CryptoAI – forskningsrapport

Skapad: 2026-11-08 10:18 UTC. Data: Binance (publik), BTCUSDT 1h, BTCUSDT 4h, BTCUSDT 15m, ETHUSDT 1h, ETHUSDT 4h, ETHUSDT 15m, SOLUSDT 1h, SOLUSDT 4h, SOLUSDT 15m, XRPUSDT 1h, XRPUSDT 4h, XRPUSDT 15m.
Alla affärer följer botens regler: signal på stängd candle, ATR-stop och take-profit, 0,1 % avgift per sida, hela kapitalet i varje affär (ränta på ränta). Allt är simulering, inga riktiga pengar.

"Buy & hold" = köp i början och sitta still hela tiden. Det är måttstocken: en strategi är bara värd något om den slår den efter avgifter och helst med mindre nedgångar.

## 1. Översikt (risk 5)

| Marknad | Period | Buy & hold | (största nedgång) | AUTO | (nedgång) | affärer | Slump-köp | Median av alla strategier |
|---|---|---|---|---|---|---|---|---|
| BTCUSDT 1h | 2019-02-03 – 2026-11-08 | 2091 % | -77 % | -81 % | -82 % | 681 | -97 % | -87 % |
| BTCUSDT 4h | 2019-05-14 – 2026-11-08 | 880 % | -77 % | 196 % | -30 % | 238 | -6 % | -21 % |
| BTCUSDT 15m | 2024-11-16 – 2026-11-08 | -17 % | -54 % | -55 % | -55 % | 323 | -99 % | -91 % |
| ETHUSDT 1h | 2019-02-03 – 2026-11-08 | 1965 % | -81 % | -94 % | -95 % | 827 | -97 % | -91 % |
| ETHUSDT 4h | 2019-05-14 – 2026-11-08 | 1002 % | -81 % | -20 % | -80 % | 275 | 64 % | -59 % |
| ETHUSDT 15m | 2024-11-16 – 2026-11-08 | -30 % | -69 % | -67 % | -70 % | 564 | -99 % | -91 % |
| SOLUSDT 1h | 2020-09-13 – 2026-11-08 | 2708 % | -97 % | -97 % | -98 % | 730 | -98 % | -86 % |
| SOLUSDT 4h | 2020-12-23 – 2026-11-08 | 6282 % | -97 % | -85 % | -94 % | 223 | -45 % | -21 % |
| SOLUSDT 15m | 2024-11-16 – 2026-11-08 | -59 % | -79 % | -82 % | -82 % | 634 | -99 % | -87 % |
| XRPUSDT 1h | 2019-02-03 – 2026-11-08 | 280 % | -85 % | -98 % | -98 % | 765 | -100 % | -90 % |
| XRPUSDT 4h | 2019-05-14 – 2026-11-08 | 193 % | -84 % | 66 % | -65 % | 219 | -86 % | -40 % |
| XRPUSDT 15m | 2024-11-16 – 2026-11-08 | 0 % | -73 % | -78 % | -79 % | 573 | -99 % | -92 % |

AUTO slog buy & hold på avkastning i **0 av 12** marknader, på avkastning per risk (avkastning / största nedgång) i **0 av 12**, och var plus i 2 av 12.

## 2. Strategierna var för sig (alla risknivåer, alla marknader)

"Slår B&H" = i hur många av alla tester (marknad x risknivå) strategin hade högre avkastning än buy & hold. "Slår slump" = högre än slumpköp med samma stop/TP. "Plus" = avkastning över 0.

| Strategi | Typ | Snitt-avkastning | Median | Slår B&H | Slår slump | Plus | Snitt största nedgång | Snitt affärer |
|---|---|---|---|---|---|---|---|---|
| Ichimoku (TK-kors över molnet) | trend | +23.2 % | -56.9 % | 0/36 | 32/36 | 13/36 | -63 % | 527 |
| Keltner breakout (EMA 20 + 2 ATR) | trend | +11.0 % | -74.8 % | 1/36 | 35/36 | 12/36 | -77 % | 1015 |
| RSI-dip i upptrend (EMA 100) | revert | -2.0 % | -6.3 % | 9/36 | 32/36 | 10/36 | -12 % | 28 |
| EMA 50/200 (Golden Cross) | trend | -10.8 % | -23.9 % | 3/36 | 32/36 | 8/36 | -38 % | 147 |
| Donchian 55/20 (Turtle) | trend | -16.7 % | -73.8 % | 0/36 | 34/36 | 8/36 | -76 % | 764 |
| Donchian 20/10 (breakout) | trend | -51.5 % | -91.6 % | 0/36 | 23/36 | 5/36 | -89 % | 1351 |
| SuperTrend 10/3 | trend | -57.3 % | -78.1 % | 0/36 | 29/36 | 2/36 | -76 % | 606 |
| SMA 20/50 | trend | -63.8 % | -79.0 % | 0/36 | 29/36 | 3/36 | -76 % | 580 |
| EMA 9/21 | trend | -66.6 % | -93.5 % | 0/36 | 25/36 | 2/36 | -86 % | 1137 |
| EMA 3/8 (snabbtest) | trend | -70.8 % | -100.0 % | 0/36 | 3/36 | 2/36 | -95 % | 3265 |
| ADX/DI trend 14 | trend | -76.8 % | -89.2 % | 0/36 | 24/36 | 0/36 | -83 % | 779 |
| Stochastic 14/3/3 | revert | -79.7 % | -98.1 % | 0/36 | 15/36 | 1/36 | -91 % | 1336 |
| MACD 12/26/9 | trend | -79.8 % | -99.0 % | 0/36 | 12/36 | 1/36 | -94 % | 1947 |
| RSI 14 (köp under 30, sälj över 70) | revert | -84.7 % | -92.1 % | 0/36 | 22/36 | 0/36 | -90 % | 777 |
| Bollinger 20/2 (mean reversion) | revert | -96.8 % | -98.9 % | 0/36 | 8/36 | 0/36 | -98 % | 1769 |

## 3. Håll-ut-testet: fungerar det att välja "bästa" strategin i efterhand?

Perioden delas på mitten. De 3 bästa strategierna på första halvan väljs ut, och mäts sedan på andra halvan som de aldrig "sett". Om historiskt bra betyder framtida bra ska de ligga över snittet.

| Marknad | Delningsdatum | Valda | Deras avkastning 2:a halvan | Snitt av ALLA strategier 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|---|---|
| BTCUSDT 1h | 2022-12-23 | Keltner breakout (EMA 20 + 2 ATR), RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross) | -22.6 % | -64.4 % | +349.8 % |
| BTCUSDT 4h | 2023-02-12 | Donchian 55/20 (Turtle), Ichimoku (TK-kors över molnet), Donchian 20/10 (breakout) | +6.6 % | -8.0 % | +247.8 % |
| BTCUSDT 15m | 2025-11-12 | RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross), Ichimoku (TK-kors över molnet) | -25.8 % | -69.4 % | -27.7 % |
| ETHUSDT 1h | 2022-12-23 | Keltner breakout (EMA 20 + 2 ATR), Ichimoku (TK-kors över molnet), EMA 50/200 (Golden Cross) | -50.3 % | -71.4 % | +82.3 % |
| ETHUSDT 4h | 2023-02-12 | Keltner breakout (EMA 20 + 2 ATR), Donchian 55/20 (Turtle), EMA 9/21 | -14.1 % | -28.4 % | +46.1 % |
| ETHUSDT 15m | 2025-11-12 | RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross), Ichimoku (TK-kors över molnet) | -27.3 % | -69.5 % | -37.5 % |
| SOLUSDT 1h | 2023-10-12 | Ichimoku (TK-kors över molnet), RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross) | -10.3 % | -52.3 % | +317.5 % |
| SOLUSDT 4h | 2023-12-02 | EMA 3/8 (snabbtest), Ichimoku (TK-kors över molnet), EMA 9/21 | -15.1 % | -8.1 % | +46.2 % |
| SOLUSDT 15m | 2025-11-12 | RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross), Ichimoku (TK-kors över molnet) | -28.5 % | -67.0 % | -44.5 % |
| XRPUSDT 1h | 2022-12-23 | RSI-dip i upptrend (EMA 100), EMA 50/200 (Golden Cross), RSI 14 (köp under 30, sälj över 70) | -35.1 % | -67.8 % | +233.3 % |
| XRPUSDT 4h | 2023-02-12 | Stochastic 14/3/3, EMA 50/200 (Golden Cross), Donchian 20/10 (breakout) | +24.5 % | +14.3 % | +205.0 % |
| XRPUSDT 15m | 2025-11-12 | RSI-dip i upptrend (EMA 100), Ichimoku (TK-kors över molnet), EMA 50/200 (Golden Cross) | -33.1 % | -67.5 % | -52.5 % |

De utvalda slog snittet av alla strategier i **11 av 12** fall och buy & hold i **4 av 12**. Slumpen ger ungefär hälften, så mycket över det tyder på riktig förmåga, nära hälften tyder på att urvalet mest var tur.

## 4. AUTO år för år mot buy & hold (risk 5)

| Marknad | 2019 | 2020 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 |
|---|---|---|---|---|---|---|---|---|
| BTCUSDT 1h | AUTO -26 / B&H 108 | AUTO -1 / B&H 302 | AUTO -16 / B&H 59 | AUTO -24 / B&H -65 | AUTO -27 / B&H 155 | AUTO -21 / B&H 120 | AUTO -24 / B&H -7 | AUTO -13 / B&H -14 |
| BTCUSDT 4h | AUTO 60 / B&H -7 | AUTO 63 / B&H 300 | AUTO 0 / B&H 58 | AUTO -8 / B&H -65 | AUTO 21 / B&H 155 | AUTO 15 / B&H 121 | AUTO -12 / B&H -7 | AUTO -1 / B&H -14 |
| BTCUSDT 15m | – | – | – | – | – | – | AUTO -34 / B&H -7 | AUTO -28 / B&H -14 |
| ETHUSDT 1h | AUTO -37 / B&H 19 | AUTO 0 / B&H 470 | AUTO -39 / B&H 400 | AUTO -33 / B&H -68 | AUTO -31 / B&H 91 | AUTO -34 / B&H 45 | AUTO -17 / B&H -12 | AUTO -40 / B&H -25 |
| ETHUSDT 4h | AUTO -6 / B&H -37 | AUTO 64 / B&H 464 | AUTO 140 / B&H 393 | AUTO -32 / B&H -68 | AUTO -35 / B&H 91 | AUTO -35 / B&H 46 | AUTO 19 / B&H -12 | AUTO -39 / B&H -25 |
| ETHUSDT 15m | – | – | – | – | – | – | AUTO -36 / B&H -11 | AUTO -40 / B&H -25 |
| SOLUSDT 1h | – | AUTO -50 / B&H -53 | AUTO -45 / B&H 10886 | AUTO -72 / B&H -94 | AUTO -26 / B&H 916 | AUTO -43 / B&H 85 | AUTO -24 / B&H -35 | AUTO 3 / B&H -29 |
| SOLUSDT 4h | – | – | AUTO -40 / B&H 10484 | AUTO -36 / B&H -94 | AUTO -6 / B&H 918 | AUTO -46 / B&H 83 | AUTO -16 / B&H -35 | AUTO -18 / B&H -29 |
| SOLUSDT 15m | – | – | – | – | – | – | AUTO -61 / B&H -35 | AUTO -41 / B&H -29 |
| XRPUSDT 1h | AUTO -55 / B&H -37 | AUTO 0 / B&H 14 | AUTO -65 / B&H 274 | AUTO -44 / B&H -60 | AUTO -33 / B&H 81 | AUTO -20 / B&H 237 | AUTO -49 / B&H -13 | AUTO -20 / B&H -37 |
| XRPUSDT 4h | AUTO -32 / B&H -51 | AUTO 57 / B&H 13 | AUTO 6 / B&H 264 | AUTO 14 / B&H -60 | AUTO 25 / B&H 82 | AUTO 55 / B&H 239 | AUTO -23 / B&H -13 | AUTO -13 / B&H -37 |
| XRPUSDT 15m | – | – | – | – | – | – | AUTO -62 / B&H -12 | AUTO -20 / B&H -37 |

(Procent. AUTO / buy & hold.) AUTO slog buy & hold i 23 av 69 marknadsår. I år då marknaden föll slog den buy & hold i 22 av 37.

## 5. Hjälper det att handla snabbare?

| Tidsintervall | Snitt AUTO-avkastning | Snitt buy & hold | Snitt affärer | Snitt avgifter (andel av kapitalet, ca) |
|---|---|---|---|---|
| 15m | -70.3 % | -26.4 % | 524 | 105 % |
| 1h | -92.7 % | +1761.0 % | 751 | 150 % |
| 4h | +39.3 % | +2089.1 % | 239 | 48 % |

Obs: 15m täcker bara de senaste två åren, så jämför kolumnen mot buy & hold för samma period, inte mot 1h/4h-raderna.

## 6. Slutsats (automatiskt genererad ur siffrorna ovan)

- AUTO slog **inte** buy & hold på avkastning i de flesta marknader.
- Inte heller risken per avkastad krona var tydligt bättre än buy & hold.
- Håll-ut-testet: de utvalda strategierna förlorade mindre än genomsnittet av alla strategier (11 av 12), men slog buy & hold bara i 4 av 12. Att välja bland strategier hjälper alltså lite, men räcker inte för att slå att bara köpa och behålla.
- Att handla snabbare (1h) gav sämre resultat än långsammare (4h): avgifterna och falska signaler äter upp vinsterna.

**Viktigt:** historik garanterar ingenting. Kryptomarknaden har haft både extrema uppgångar och fall under perioden, och resultaten beror mycket på just den. Testerna använder inga inställningar som trimmats mot datan (strategiernas parametrar är standardvärden), men att jag tittar på många strategier ökar ändå risken att någon ser bra ut av ren slump. Använd inte detta som finansiell rådgivning.
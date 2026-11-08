# Långsam handel: dagliga och veckovisa candles

Skapad 2026-11-08 10:19 UTC. Avgift 0,1 % per sida. Marknader: BTC, ETH, SOL, XRP. Hela kapitalet i varje affär.
"Standard" = botens ATR-stop/take-profit. "Ren signal" = ingen stop/TP, bara köp- och säljsignaler. Medelvärdesregeln köper när kursen korsar upp över sitt medelvärde (200 dagar, eller 40 veckor) och säljer när den ligger under.

## Dagliga candles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 8.1) |
|---|---|---|---|---|---|---|---|
| SuperTrend 10/3 | ren signal | 1889 % | 3/4 | 4/4 | -60 % | 32 | 36.0 |
| EMA 9/21 | ren signal | 1514 % | 3/4 | 4/4 | -68 % | 54 | 24.5 |
| Kurs över/under medelvärde (kort) | ren signal | 938 % | 1/4 | 3/4 | -72 % | 61 | 21.0 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 763 % | 2/4 | 4/4 | -47 % | 34 | 16.9 |
| SMA 20/50 | ren signal | 839 % | 3/4 | 4/4 | -67 % | 28 | 13.3 |
| Donchian 20/10 (breakout) | ren signal | 812 % | 3/4 | 4/4 | -66 % | 37 | 13.3 |
| EMA 3/8 (snabbtest) | ren signal | 862 % | 2/4 | 4/4 | -66 % | 162 | 12.8 |
| MACD 12/26/9 | ren signal | 777 % | 2/4 | 4/4 | -67 % | 97 | 11.8 |
| Ichimoku (TK-kors över molnet) | ren signal | 497 % | 1/4 | 2/4 | -56 % | 20 | 11.3 |
| Donchian 55/20 (Turtle) | ren signal | 602 % | 2/4 | 4/4 | -66 % | 18 | 10.4 |
| Kurs över/under medelvärde (lång) | ren signal | 671 % | 2/4 | 3/4 | -72 % | 31 | 9.8 |
| Donchian 20/10 (breakout) | standard | 277 % | 1/4 | 3/4 | -58 % | 86 | 5.6 |
| *Buy & hold* | | 639 % | | | -84 % | 1 | 8.1 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | SuperTrend 10/3 (ren), Kurs över/under medelvärde (kort) (ren), EMA 9/21 (ren) | 158 % | 290 % |
| ETH | EMA 9/21 (ren), SuperTrend 10/3 (ren), Donchian 20/10 (breakout) (ren) | 45 % | 70 % |
| SOL | Keltner breakout (EMA 20 + 2 ATR) (ren), SuperTrend 10/3 (ren), EMA 3/8 (snabbtest) (ren) | 54 % | -7 % |
| XRP | MACD 12/26/9 (ren), EMA 3/8 (snabbtest) (ren), RSI 14 (köp under 30, sälj över 70) (ren) | 52 % | 199 % |

De utvalda slog buy & hold på andra halvan i 1 av 4 marknader.

## Veckocandles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 12.4) |
|---|---|---|---|---|---|---|---|
| RSI 14 (köp under 30, sälj över 70) | standard | 128 % | 1/4 | 4/4 | -0 % | 2 | 128.4 |
| EMA 50/200 (Golden Cross) | standard | 14 % | 1/4 | 3/4 | -18 % | 2 | 22.2 |
| Kurs över/under medelvärde (kort) | ren signal | 878 % | 1/4 | 4/4 | -64 % | 17 | 16.4 |
| EMA 3/8 (snabbtest) | ren signal | 747 % | 2/4 | 3/4 | -67 % | 22 | 13.8 |
| Ichimoku (TK-kors över molnet) | standard | 53 % | 1/4 | 4/4 | -15 % | 3 | 11.7 |
| Kurs över/under medelvärde (lång) | ren signal | 609 % | 1/4 | 4/4 | -65 % | 13 | 11.4 |
| MACD 12/26/9 | ren signal | 644 % | 2/4 | 3/4 | -68 % | 12 | 11.0 |
| SMA 20/50 | ren signal | 424 % | 2/4 | 4/4 | -66 % | 3 | 7.7 |
| Stochastic 14/3/3 | standard | 233 % | 1/4 | 2/4 | -47 % | 7 | 6.8 |
| Donchian 20/10 (breakout) | ren signal | 398 % | 2/4 | 4/4 | -65 % | 5 | 6.3 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 203 % | 1/4 | 3/4 | -66 % | 7 | 4.7 |
| MACD 12/26/9 | standard | 120 % | 1/4 | 2/4 | -51 % | 12 | 4.3 |
| *Buy & hold* | | 942 % | | | -82 % | 1 | 12.4 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | EMA 3/8 (snabbtest) (ren), Kurs över/under medelvärde (kort) (ren), Keltner breakout (EMA 20 + 2 ATR) (ren) | 134 % | 371 % |
| ETH | Kurs över/under medelvärde (kort) (ren), MACD 12/26/9 (ren), Kurs över/under medelvärde (lång) (ren) | 69 % | 89 % |
| SOL | Kurs över/under medelvärde (lång) (ren), Kurs över/under medelvärde (kort) (ren), EMA 3/8 (snabbtest) (ren) | -32 % | -32 % |
| XRP | Bollinger 20/2 (mean reversion) (std), Bollinger 20/2 (mean reversion) (ren), Stochastic 14/3/3 (std) | -3 % | 240 % |

De utvalda slog buy & hold på andra halvan i 0 av 4 marknader.

**Läsning:** slår en långsam regel buy & hold på avkastning är det värt att titta närmare. Slår den bara på avkastning per risk betyder det att den har mindre nedgångar men tjänar mindre. Mycket få affärer (ofta under 10 per marknad) gör att siffrorna är osäkra, och urvalet bland många regler ger en risk att något ser bra ut av ren slump. Historik garanterar ingenting.
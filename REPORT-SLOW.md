# Långsam handel: dagliga och veckovisa candles

Skapad 2026-11-22 11:19 UTC. Avgift 0,1 % per sida. Marknader: BTC, ETH, SOL, XRP. Hela kapitalet i varje affär.
"Standard" = botens ATR-stop/take-profit. "Ren signal" = ingen stop/TP, bara köp- och säljsignaler. Medelvärdesregeln köper när kursen korsar upp över sitt medelvärde (200 dagar, eller 40 veckor) och säljer när den ligger under.

## Dagliga candles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 6.0) |
|---|---|---|---|---|---|---|---|
| SuperTrend 10/3 | ren signal | 1889 % | 3/4 | 4/4 | -60 % | 32 | 36.0 |
| EMA 9/21 | ren signal | 1514 % | 3/4 | 4/4 | -68 % | 54 | 24.5 |
| Kurs över/under medelvärde (kort) | ren signal | 938 % | 3/4 | 3/4 | -72 % | 61 | 21.0 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 763 % | 2/4 | 4/4 | -47 % | 34 | 16.9 |
| SMA 20/50 | ren signal | 839 % | 3/4 | 4/4 | -67 % | 28 | 13.3 |
| Donchian 20/10 (breakout) | ren signal | 812 % | 3/4 | 4/4 | -66 % | 37 | 13.3 |
| EMA 3/8 (snabbtest) | ren signal | 862 % | 2/4 | 4/4 | -66 % | 162 | 12.8 |
| MACD 12/26/9 | ren signal | 768 % | 2/4 | 4/4 | -67 % | 97 | 11.7 |
| Ichimoku (TK-kors över molnet) | ren signal | 497 % | 1/4 | 2/4 | -56 % | 20 | 11.3 |
| Donchian 55/20 (Turtle) | ren signal | 602 % | 2/4 | 4/4 | -66 % | 18 | 10.4 |
| Kurs över/under medelvärde (lång) | ren signal | 632 % | 3/4 | 3/4 | -72 % | 31 | 9.2 |
| Donchian 20/10 (breakout) | standard | 277 % | 1/4 | 3/4 | -58 % | 86 | 5.6 |
| *Buy & hold* | | 475 % | | | -84 % | 1 | 6.0 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | SuperTrend 10/3 (ren), Kurs över/under medelvärde (kort) (ren), EMA 9/21 (ren) | 158 % | 215 % |
| ETH | EMA 9/21 (ren), SuperTrend 10/3 (ren), Donchian 20/10 (breakout) (ren) | 45 % | 32 % |
| SOL | Keltner breakout (EMA 20 + 2 ATR) (ren), SuperTrend 10/3 (ren), EMA 3/8 (snabbtest) (ren) | 54 % | -27 % |
| XRP | MACD 12/26/9 (ren), EMA 3/8 (snabbtest) (ren), RSI 14 (köp under 30, sälj över 70) (ren) | 46 % | 165 % |

De utvalda slog buy & hold på andra halvan i 2 av 4 marknader.

## Veckocandles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 9.9) |
|---|---|---|---|---|---|---|---|
| RSI 14 (köp under 30, sälj över 70) | standard | 104 % | 2/4 | 4/4 | -6 % | 2 | 62.1 |
| EMA 50/200 (Golden Cross) | standard | 14 % | 1/4 | 3/4 | -18 % | 2 | 22.2 |
| Kurs över/under medelvärde (kort) | ren signal | 770 % | 2/4 | 4/4 | -64 % | 17 | 14.3 |
| EMA 3/8 (snabbtest) | ren signal | 747 % | 2/4 | 3/4 | -67 % | 22 | 13.8 |
| Ichimoku (TK-kors över molnet) | standard | 53 % | 1/4 | 4/4 | -15 % | 3 | 11.7 |
| Kurs över/under medelvärde (lång) | ren signal | 524 % | 2/4 | 4/4 | -65 % | 13 | 9.7 |
| MACD 12/26/9 | ren signal | 502 % | 2/4 | 3/4 | -68 % | 12 | 8.6 |
| SMA 20/50 | ren signal | 424 % | 2/4 | 4/4 | -66 % | 3 | 7.7 |
| Donchian 20/10 (breakout) | ren signal | 376 % | 2/4 | 4/4 | -65 % | 5 | 5.9 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 203 % | 1/4 | 3/4 | -66 % | 7 | 4.7 |
| Stochastic 14/3/3 | standard | 173 % | 2/4 | 2/4 | -48 % | 7 | 4.6 |
| MACD 12/26/9 | standard | 115 % | 1/4 | 2/4 | -51 % | 12 | 4.2 |
| *Buy & hold* | | 751 % | | | -82 % | 1 | 9.9 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | EMA 3/8 (snabbtest) (ren), Kurs över/under medelvärde (kort) (ren), Keltner breakout (EMA 20 + 2 ATR) (ren) | 119 % | 281 % |
| ETH | Kurs över/under medelvärde (kort) (ren), MACD 12/26/9 (ren), Kurs över/under medelvärde (lång) (ren) | 48 % | 42 % |
| SOL | Kurs över/under medelvärde (lång) (ren), Kurs över/under medelvärde (kort) (ren), EMA 3/8 (snabbtest) (ren) | -36 % | -50 % |
| XRP | Bollinger 20/2 (mean reversion) (std), Bollinger 20/2 (mean reversion) (ren), Stochastic 14/3/3 (std) | -16 % | 162 % |

De utvalda slog buy & hold på andra halvan i 2 av 4 marknader.

**Läsning:** slår en långsam regel buy & hold på avkastning är det värt att titta närmare. Slår den bara på avkastning per risk betyder det att den har mindre nedgångar men tjänar mindre. Mycket få affärer (ofta under 10 per marknad) gör att siffrorna är osäkra, och urvalet bland många regler ger en risk att något ser bra ut av ren slump. Historik garanterar ingenting.
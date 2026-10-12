# Långsam handel: dagliga och veckovisa candles

Skapad 2026-10-12 20:31 UTC. Avgift 0,1 % per sida. Marknader: BTC, ETH, SOL, XRP. Hela kapitalet i varje affär.
"Standard" = botens ATR-stop/take-profit. "Ren signal" = ingen stop/TP, bara köp- och säljsignaler. Medelvärdesregeln köper när kursen korsar upp över sitt medelvärde (200 dagar, eller 40 veckor) och säljer när den ligger under.

## Dagliga candles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 9.3) |
|---|---|---|---|---|---|---|---|
| SuperTrend 10/3 | ren signal | 1943 % | 3/4 | 4/4 | -60 % | 32 | 36.9 |
| EMA 9/21 | ren signal | 1529 % | 3/4 | 4/4 | -68 % | 54 | 24.7 |
| Kurs över/under medelvärde (kort) | ren signal | 1079 % | 2/4 | 3/4 | -72 % | 61 | 23.8 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 763 % | 2/4 | 4/4 | -47 % | 34 | 16.9 |
| EMA 3/8 (snabbtest) | ren signal | 949 % | 2/4 | 4/4 | -66 % | 160 | 14.2 |
| SMA 20/50 | ren signal | 886 % | 3/4 | 4/4 | -67 % | 28 | 14.0 |
| Donchian 20/10 (breakout) | ren signal | 812 % | 3/4 | 4/4 | -66 % | 37 | 13.3 |
| MACD 12/26/9 | ren signal | 842 % | 2/4 | 4/4 | -67 % | 96 | 12.7 |
| Donchian 55/20 (Turtle) | ren signal | 681 % | 2/4 | 4/4 | -66 % | 18 | 11.7 |
| Ichimoku (TK-kors över molnet) | ren signal | 500 % | 1/4 | 2/4 | -56 % | 20 | 11.3 |
| Kurs över/under medelvärde (lång) | ren signal | 774 % | 2/4 | 3/4 | -72 % | 31 | 11.3 |
| Donchian 20/10 (breakout) | standard | 277 % | 1/4 | 3/4 | -58 % | 86 | 5.6 |
| *Buy & hold* | | 742 % | | | -84 % | 1 | 9.3 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | SuperTrend 10/3 (ren), Kurs över/under medelvärde (kort) (ren), EMA 9/21 (ren) | 169 % | 345 % |
| ETH | EMA 9/21 (ren), SuperTrend 10/3 (ren), Donchian 20/10 (breakout) (ren) | 45 % | 96 % |
| SOL | SuperTrend 10/3 (ren), Keltner breakout (EMA 20 + 2 ATR) (ren), EMA 3/8 (snabbtest) (ren) | 55 % | 18 % |
| XRP | MACD 12/26/9 (ren), EMA 3/8 (snabbtest) (ren), RSI 14 (köp under 30, sälj över 70) (ren) | 73 % | 245 % |

De utvalda slog buy & hold på andra halvan i 1 av 4 marknader.

## Veckocandles

| Strategi | Regler | Snitt-avkastning | Slår B&H | Plus | Snitt största nedgång | Snitt affärer | Avkastning/nedgång (B&H: 13.7) |
|---|---|---|---|---|---|---|---|
| RSI 14 (köp under 30, sälj över 70) | standard | 145 % | 1/4 | 4/4 | -0 % | 2 | 144.7 |
| EMA 50/200 (Golden Cross) | standard | 14 % | 1/4 | 3/4 | -18 % | 2 | 22.2 |
| Kurs över/under medelvärde (kort) | ren signal | 974 % | 1/4 | 4/4 | -64 % | 17 | 18.1 |
| EMA 3/8 (snabbtest) | ren signal | 811 % | 2/4 | 3/4 | -67 % | 22 | 14.9 |
| Kurs över/under medelvärde (lång) | ren signal | 673 % | 1/4 | 4/4 | -65 % | 13 | 12.6 |
| MACD 12/26/9 | ren signal | 727 % | 2/4 | 3/4 | -68 % | 12 | 12.4 |
| Ichimoku (TK-kors över molnet) | standard | 53 % | 1/4 | 4/4 | -15 % | 3 | 11.7 |
| SMA 20/50 | ren signal | 424 % | 2/4 | 4/4 | -66 % | 3 | 7.7 |
| Stochastic 14/3/3 | standard | 262 % | 1/4 | 2/4 | -47 % | 7 | 7.7 |
| Donchian 20/10 (breakout) | ren signal | 437 % | 2/4 | 4/4 | -65 % | 5 | 6.9 |
| Keltner breakout (EMA 20 + 2 ATR) | ren signal | 211 % | 1/4 | 3/4 | -64 % | 7 | 4.9 |
| SuperTrend 10/3 | ren signal | 310 % | 1/4 | 3/4 | -78 % | 6 | 4.4 |
| *Buy & hold* | | 1040 % | | | -82 % | 1 | 13.7 |

(Topp 12 efter avkastning per risk, alltså avkastning delat med största nedgång.)

**Håll-ut-test:** bästa 3 på första halvan (efter poäng = avkastning − ½ nedgång), mätta på andra.

| Marknad | Valda | Deras snitt 2:a halvan | Buy & hold 2:a halvan |
|---|---|---|---|
| BTC | EMA 3/8 (snabbtest) (ren), Kurs över/under medelvärde (kort) (ren), Keltner breakout (EMA 20 + 2 ATR) (ren) | 146 % | 397 % |
| ETH | Kurs över/under medelvärde (kort) (ren), MACD 12/26/9 (ren), Kurs över/under medelvärde (lång) (ren) | 88 % | 108 % |
| SOL | Kurs över/under medelvärde (lång) (ren), Kurs över/under medelvärde (kort) (ren), EMA 3/8 (snabbtest) (ren) | -22 % | -27 % |
| XRP | Bollinger 20/2 (mean reversion) (std), Bollinger 20/2 (mean reversion) (ren), Stochastic 14/3/3 (std) | 2 % | 272 % |

De utvalda slog buy & hold på andra halvan i 1 av 4 marknader.

**Läsning:** slår en långsam regel buy & hold på avkastning är det värt att titta närmare. Slår den bara på avkastning per risk betyder det att den har mindre nedgångar men tjänar mindre. Mycket få affärer (ofta under 10 per marknad) gör att siffrorna är osäkra, och urvalet bland många regler ger en risk att något ser bra ut av ren slump. Historik garanterar ingenting.
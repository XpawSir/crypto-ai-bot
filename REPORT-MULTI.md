# Flerslagstest: daglig trendföljning

## A: ETF:er + Bitcoin (från 2015)

Skapad 2026-11-15 10:51 UTC. Period 2015-09-08 – 2026-11-15 (delningsdatum för håll-ut-test: 2021-04-12). Tillgångar: SPY, QQQ, EFA, EEM, TLT, GLD, DBC, VNQ, BTC-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 360 % | 15 % | -34 % | 0.86 | 0.43 |
| Köp och behåll lika delar (månadsvis ombalans) | 542 % | 18 % | -29 % | 1.22 | 0.62 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 152 % | 9 % | -28 % | 0.80 | 0.31 |
| Köp och behåll Bitcoin | 26808 % | 65 % | -83 % | 1.09 | 0.78 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 328 % | 14 % | -11 % | 1.43 | 1.26 | 40 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 301 % | 13 % | -12 % | 1.35 | 1.09 | 96 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 155 % | 9 % | -8 % | 1.19 | 1.06 | 49 |
| Trendkorg SMA 200, ombalans var 1:e dag | 271 % | 12 % | -12 % | 1.30 | 1.00 | 99 |
| Trendkorg SMA 100, ombalans var 7:e dag | 326 % | 14 % | -14 % | 1.48 | 0.99 | 42 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 309 % | 13 % | -14 % | 1.36 | 0.95 | 39 |
| Trendkorg SMA 150, ombalans var 7:e dag | 290 % | 13 % | -14 % | 1.36 | 0.93 | 41 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 316 % | 14 % | -15 % | 1.34 | 0.92 | 97 |
| Dubbelmomentum 90d, topp 3, filter SMA 200 (veckovis) | 1116 % | 25 % | -29 % | 1.18 | 0.87 | 39 |
| Trendkorg SMA 50, ombalans var 7:e dag | 344 % | 14 % | -16 % | 1.56 | 0.87 | 46 |
| Trendkorg SMA 150, ombalans var 1:e dag | 280 % | 13 % | -15 % | 1.36 | 0.87 | 103 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 297 % | 13 % | -15 % | 1.36 | 0.87 | 40 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 13 % | -16 % | 11/12 / 11/12 / 9/12 | 12/12 / 12/12 / 2/12 |
| Tidsserie-momentum | 12 | 13 % | -18 % | 11/12 / 9/12 / 8/12 | 12/12 / 12/12 / 5/12 |
| Riskviktad trend | 4 | 8 % | -10 % | 3/4 / 3/4 / 3/4 | 4/4 / 4/4 / 2/4 |
| Dubbelmomentum | 4 | 27 % | -35 % | 3/4 / 4/4 / 0/4 | 4/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 12 % | 0.83 | 118 |
| var 7:e dag | 13 % | 0.90 | 42 |
| var 30:e dag | 13 % | 0.67 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 2.01 | 6 % | -11 % | 0.58 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 1.89 | 6 % | -14 % | 0.45 |
| Trendkorg SMA 100, ombalans var 7:e dag | 1.81 | 6 % | -14 % | 0.43 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 1.81 | 7 % | -12 % | 0.55 |
| Tidsserie-momentum 60d, ombalans var 1:e dag | 1.79 | 3 % | -19 % | 0.17 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 1.69 | 6 % | -8 % | 0.67 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 13 % | -25 % | 0.53 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 10 % | -29 % | 0.34 |

### Slutsats (automatisk)

- Av 32 strategier slog 20 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 9 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 5 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -16 % mot -29 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

## B: ETF:er + Bitcoin + Ethereum (från 2018)

Skapad 2026-11-15 10:51 UTC. Period 2018-09-08 – 2026-11-15 (delningsdatum för håll-ut-test: 2022-10-12). Tillgångar: SPY, QQQ, TLT, GLD, DBC, BTC-USD, ETH-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 197 % | 14 % | -34 % | 0.79 | 0.42 |
| Köp och behåll lika delar (månadsvis ombalans) | 488 % | 24 % | -39 % | 1.04 | 0.62 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 89 % | 8 % | -28 % | 0.69 | 0.29 |
| Köp och behåll Bitcoin | 953 % | 33 % | -77 % | 0.78 | 0.43 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Tidsserie-momentum 250d, ombalans var 7:e dag | 329 % | 19 % | -16 % | 1.16 | 1.22 | 40 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 364 % | 21 % | -17 % | 1.27 | 1.19 | 39 |
| Trendkorg SMA 50, ombalans var 7:e dag | 371 % | 21 % | -19 % | 1.35 | 1.10 | 45 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 262 % | 17 % | -17 % | 1.04 | 1.03 | 127 |
| Tidsserie-momentum 120d, ombalans var 30:e dag | 327 % | 19 % | -20 % | 1.12 | 0.97 | 11 |
| Trendkorg SMA 150, ombalans var 1:e dag | 358 % | 20 % | -21 % | 1.29 | 0.97 | 123 |
| Tidsserie-momentum 250d, ombalans var 30:e dag | 270 % | 17 % | -18 % | 1.02 | 0.94 | 11 |
| Trendkorg SMA 50, ombalans var 30:e dag | 304 % | 19 % | -20 % | 1.16 | 0.92 | 12 |
| Tidsserie-momentum 120d, ombalans var 1:e dag | 293 % | 18 % | -21 % | 1.14 | 0.88 | 130 |
| Trendkorg SMA 200, ombalans var 1:e dag | 286 % | 18 % | -21 % | 1.14 | 0.87 | 119 |
| Trendkorg SMA 50, ombalans var 1:e dag | 393 % | 21 % | -25 % | 1.40 | 0.86 | 160 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 130 % | 11 % | -12 % | 1.21 | 0.86 | 47 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 18 % | -23 % | 11/12 / 12/12 / 5/12 | 12/12 / 12/12 / 5/12 |
| Tidsserie-momentum | 12 | 17 % | -20 % | 9/12 / 11/12 / 1/12 | 12/12 / 12/12 / 1/12 |
| Riskviktad trend | 4 | 10 % | -14 % | 4/4 / 4/4 / 4/4 | 4/4 / 4/4 / 3/4 |
| Dubbelmomentum | 4 | 25 % | -51 % | 1/4 / 2/4 / 0/4 | 2/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 18 % | 0.85 | 134 |
| var 7:e dag | 17 % | 0.83 | 40 |
| var 30:e dag | 17 % | 0.71 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 1.89 | 11 % | -12 % | 0.91 |
| Trendkorg SMA 150, ombalans var 1:e dag | 1.79 | 13 % | -9 % | 1.36 |
| Trendkorg SMA 50, ombalans var 1:e dag | 1.78 | 13 % | -10 % | 1.35 |
| Trendkorg SMA 50, ombalans var 7:e dag | 1.71 | 15 % | -9 % | 1.54 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 1.67 | 13 % | -13 % | 0.94 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 1.59 | 10 % | -14 % | 0.74 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 22 % | -19 % | 1.15 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 21 % | -21 % | 1.04 |

### Slutsats (automatisk)

- Av 32 strategier slog 10 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 9 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 3 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -21 % mot -39 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
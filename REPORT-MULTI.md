# Flerslagstest: daglig trendföljning

## A: ETF:er + Bitcoin (från 2015)

Skapad 2026-11-22 11:19 UTC. Period 2015-09-08 – 2026-11-22 (delningsdatum för håll-ut-test: 2021-04-16). Tillgångar: SPY, QQQ, EFA, EEM, TLT, GLD, DBC, VNQ, BTC-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 320 % | 14 % | -34 % | 0.81 | 0.40 |
| Köp och behåll lika delar (månadsvis ombalans) | 498 % | 17 % | -29 % | 1.17 | 0.59 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 141 % | 8 % | -28 % | 0.76 | 0.30 |
| Köp och behåll Bitcoin | 24894 % | 64 % | -83 % | 1.08 | 0.76 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 322 % | 14 % | -11 % | 1.41 | 1.25 | 40 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 297 % | 13 % | -12 % | 1.34 | 1.08 | 96 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 151 % | 9 % | -8 % | 1.17 | 1.04 | 49 |
| Trendkorg SMA 200, ombalans var 1:e dag | 268 % | 12 % | -12 % | 1.29 | 0.99 | 99 |
| Trendkorg SMA 100, ombalans var 7:e dag | 324 % | 14 % | -14 % | 1.47 | 0.99 | 42 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 299 % | 13 % | -14 % | 1.34 | 0.93 | 39 |
| Trendkorg SMA 150, ombalans var 7:e dag | 287 % | 13 % | -14 % | 1.35 | 0.92 | 41 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 294 % | 13 % | -15 % | 1.28 | 0.88 | 97 |
| Trendkorg SMA 150, ombalans var 1:e dag | 279 % | 13 % | -15 % | 1.36 | 0.87 | 103 |
| Trendkorg SMA 50, ombalans var 7:e dag | 341 % | 14 % | -16 % | 1.55 | 0.87 | 46 |
| Dubbelmomentum 90d, topp 3, filter SMA 200 (veckovis) | 1096 % | 25 % | -29 % | 1.18 | 0.87 | 39 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 290 % | 13 % | -15 % | 1.34 | 0.86 | 40 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 13 % | -16 % | 11/12 / 11/12 / 9/12 | 12/12 / 12/12 / 3/12 |
| Tidsserie-momentum | 12 | 13 % | -18 % | 12/12 / 9/12 / 8/12 | 12/12 / 12/12 / 5/12 |
| Riskviktad trend | 4 | 8 % | -10 % | 3/4 / 3/4 / 3/4 | 4/4 / 4/4 / 2/4 |
| Dubbelmomentum | 4 | 26 % | -35 % | 3/4 / 4/4 / 0/4 | 4/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 12 % | 0.81 | 118 |
| var 7:e dag | 13 % | 0.89 | 42 |
| var 30:e dag | 13 % | 0.66 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 2.04 | 6 % | -11 % | 0.53 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 1.93 | 6 % | -14 % | 0.39 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 1.84 | 6 % | -12 % | 0.51 |
| Trendkorg SMA 100, ombalans var 7:e dag | 1.84 | 6 % | -14 % | 0.40 |
| Tidsserie-momentum 60d, ombalans var 1:e dag | 1.82 | 3 % | -19 % | 0.15 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 1.72 | 5 % | -8 % | 0.60 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 11 % | -25 % | 0.44 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 8 % | -29 % | 0.28 |

### Slutsats (automatisk)

- Av 32 strategier slog 20 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 10 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 5 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -16 % mot -29 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

## B: ETF:er + Bitcoin + Ethereum (från 2018)

Skapad 2026-11-22 11:19 UTC. Period 2018-09-08 – 2026-11-22 (delningsdatum för håll-ut-test: 2022-10-16). Tillgångar: SPY, QQQ, TLT, GLD, DBC, BTC-USD, ETH-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 172 % | 13 % | -34 % | 0.73 | 0.38 |
| Köp och behåll lika delar (månadsvis ombalans) | 451 % | 23 % | -39 % | 1.00 | 0.59 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 81 % | 7 % | -28 % | 0.65 | 0.27 |
| Köp och behåll Bitcoin | 878 % | 32 % | -77 % | 0.76 | 0.42 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 344 % | 20 % | -17 % | 1.24 | 1.15 | 39 |
| Trendkorg SMA 50, ombalans var 7:e dag | 371 % | 21 % | -19 % | 1.35 | 1.09 | 45 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 309 % | 19 % | -17 % | 1.12 | 1.08 | 40 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 249 % | 16 % | -17 % | 1.01 | 0.99 | 127 |
| Trendkorg SMA 150, ombalans var 1:e dag | 358 % | 20 % | -21 % | 1.28 | 0.97 | 123 |
| Tidsserie-momentum 120d, ombalans var 30:e dag | 311 % | 19 % | -20 % | 1.09 | 0.94 | 11 |
| Trendkorg SMA 50, ombalans var 30:e dag | 303 % | 18 % | -20 % | 1.16 | 0.92 | 12 |
| Tidsserie-momentum 250d, ombalans var 30:e dag | 251 % | 17 % | -18 % | 0.97 | 0.90 | 11 |
| Tidsserie-momentum 120d, ombalans var 1:e dag | 287 % | 18 % | -21 % | 1.12 | 0.87 | 130 |
| Trendkorg SMA 200, ombalans var 1:e dag | 283 % | 18 % | -21 % | 1.13 | 0.86 | 119 |
| Trendkorg SMA 50, ombalans var 1:e dag | 394 % | 21 % | -25 % | 1.40 | 0.86 | 159 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 235 % | 16 % | -19 % | 1.00 | 0.84 | 118 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 18 % | -23 % | 11/12 / 12/12 / 6/12 | 12/12 / 12/12 / 5/12 |
| Tidsserie-momentum | 12 | 16 % | -20 % | 9/12 / 11/12 / 1/12 | 12/12 / 12/12 / 1/12 |
| Riskviktad trend | 4 | 10 % | -14 % | 4/4 / 4/4 / 3/4 | 4/4 / 4/4 / 3/4 |
| Dubbelmomentum | 4 | 24 % | -51 % | 1/4 / 2/4 / 0/4 | 2/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 18 % | 0.85 | 134 |
| var 7:e dag | 17 % | 0.82 | 40 |
| var 30:e dag | 16 % | 0.68 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 1.89 | 10 % | -16 % | 0.63 |
| Trendkorg SMA 150, ombalans var 1:e dag | 1.79 | 13 % | -9 % | 1.35 |
| Trendkorg SMA 50, ombalans var 1:e dag | 1.76 | 13 % | -10 % | 1.36 |
| Trendkorg SMA 50, ombalans var 7:e dag | 1.71 | 15 % | -9 % | 1.59 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 1.67 | 11 % | -17 % | 0.65 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 1.58 | 9 % | -16 % | 0.56 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 19 % | -19 % | 1.00 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 20 % | -21 % | 0.96 |

### Slutsats (automatisk)

- Av 32 strategier slog 10 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 9 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 3 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -21 % mot -39 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
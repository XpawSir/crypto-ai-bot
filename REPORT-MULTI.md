# Flerslagstest: daglig trendföljning

## A: ETF:er + Bitcoin (från 2015)

Skapad 2026-11-08 10:20 UTC. Period 2015-09-08 – 2026-11-08 (delningsdatum för håll-ut-test: 2021-04-09). Tillgångar: SPY, QQQ, EFA, EEM, TLT, GLD, DBC, VNQ, BTC-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 348 % | 14 % | -34 % | 0.85 | 0.43 |
| Köp och behåll lika delar (månadsvis ombalans) | 550 % | 18 % | -29 % | 1.23 | 0.63 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 151 % | 9 % | -28 % | 0.80 | 0.31 |
| Köp och behåll Bitcoin | 31048 % | 67 % | -83 % | 1.11 | 0.80 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 336 % | 14 % | -11 % | 1.45 | 1.28 | 40 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 302 % | 13 % | -12 % | 1.35 | 1.09 | 96 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 157 % | 9 % | -8 % | 1.20 | 1.07 | 49 |
| Trendkorg SMA 200, ombalans var 1:e dag | 276 % | 13 % | -12 % | 1.32 | 1.01 | 98 |
| Trendkorg SMA 100, ombalans var 7:e dag | 329 % | 14 % | -14 % | 1.49 | 1.00 | 42 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 308 % | 13 % | -14 % | 1.36 | 0.95 | 39 |
| Trendkorg SMA 150, ombalans var 7:e dag | 298 % | 13 % | -14 % | 1.38 | 0.94 | 41 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 319 % | 14 % | -15 % | 1.35 | 0.92 | 97 |
| Dubbelmomentum 90d, topp 3, filter SMA 200 (veckovis) | 1188 % | 26 % | -29 % | 1.21 | 0.90 | 39 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 306 % | 13 % | -15 % | 1.39 | 0.89 | 40 |
| Trendkorg SMA 150, ombalans var 1:e dag | 286 % | 13 % | -15 % | 1.37 | 0.88 | 103 |
| Trendkorg SMA 50, ombalans var 7:e dag | 347 % | 14 % | -16 % | 1.57 | 0.88 | 46 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 13 % | -16 % | 11/12 / 11/12 / 9/12 | 12/12 / 12/12 / 4/12 |
| Tidsserie-momentum | 12 | 13 % | -18 % | 10/12 / 9/12 / 8/12 | 12/12 / 12/12 / 5/12 |
| Riskviktad trend | 4 | 8 % | -10 % | 3/4 / 3/4 / 3/4 | 4/4 / 4/4 / 2/4 |
| Dubbelmomentum | 4 | 27 % | -35 % | 3/4 / 4/4 / 0/4 | 4/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 12 % | 0.84 | 118 |
| var 7:e dag | 13 % | 0.92 | 42 |
| var 30:e dag | 13 % | 0.67 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 2.00 | 7 % | -11 % | 0.62 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 1.89 | 6 % | -14 % | 0.45 |
| Trendkorg SMA 100, ombalans var 7:e dag | 1.81 | 6 % | -14 % | 0.44 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 1.81 | 7 % | -12 % | 0.56 |
| Tidsserie-momentum 60d, ombalans var 1:e dag | 1.79 | 3 % | -19 % | 0.18 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 1.69 | 6 % | -8 % | 0.70 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 12 % | -25 % | 0.51 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 10 % | -29 % | 0.35 |

### Slutsats (automatisk)

- Av 32 strategier slog 20 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 11 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 5 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -16 % mot -29 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

## B: ETF:er + Bitcoin + Ethereum (från 2018)

Skapad 2026-11-08 10:20 UTC. Period 2018-09-08 – 2026-11-08 (delningsdatum för håll-ut-test: 2022-10-09). Tillgångar: SPY, QQQ, TLT, GLD, DBC, BTC-USD, ETH-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 190 % | 14 % | -34 % | 0.77 | 0.41 |
| Köp och behåll lika delar (månadsvis ombalans) | 520 % | 25 % | -39 % | 1.06 | 0.64 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 88 % | 8 % | -28 % | 0.69 | 0.29 |
| Köp och behåll Bitcoin | 1119 % | 36 % | -77 % | 0.81 | 0.47 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Tidsserie-momentum 250d, ombalans var 7:e dag | 348 % | 20 % | -16 % | 1.20 | 1.26 | 40 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 387 % | 21 % | -17 % | 1.32 | 1.23 | 39 |
| Trendkorg SMA 50, ombalans var 7:e dag | 373 % | 21 % | -19 % | 1.35 | 1.10 | 45 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 279 % | 18 % | -17 % | 1.07 | 1.07 | 126 |
| Tidsserie-momentum 120d, ombalans var 30:e dag | 346 % | 20 % | -20 % | 1.15 | 1.01 | 11 |
| Trendkorg SMA 150, ombalans var 1:e dag | 371 % | 21 % | -21 % | 1.31 | 0.99 | 122 |
| Tidsserie-momentum 250d, ombalans var 30:e dag | 286 % | 18 % | -18 % | 1.05 | 0.97 | 11 |
| Trendkorg SMA 50, ombalans var 30:e dag | 307 % | 19 % | -20 % | 1.17 | 0.93 | 12 |
| Tidsserie-momentum 120d, ombalans var 1:e dag | 317 % | 19 % | -21 % | 1.19 | 0.92 | 130 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 137 % | 11 % | -12 % | 1.25 | 0.89 | 47 |
| Dubbelmomentum 90d, topp 2, filter SMA 200 (veckovis) | 2149 % | 46 % | -52 % | 1.09 | 0.89 | 33 |
| Trendkorg SMA 200, ombalans var 1:e dag | 295 % | 18 % | -21 % | 1.16 | 0.89 | 118 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 19 % | -23 % | 11/12 / 12/12 / 9/12 | 12/12 / 12/12 / 9/12 |
| Tidsserie-momentum | 12 | 18 % | -20 % | 9/12 / 11/12 / 2/12 | 12/12 / 12/12 / 2/12 |
| Riskviktad trend | 4 | 11 % | -14 % | 4/4 / 4/4 / 4/4 | 4/4 / 4/4 / 4/4 |
| Dubbelmomentum | 4 | 26 % | -51 % | 2/4 / 2/4 / 2/4 | 2/4 / 4/4 / 2/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 18 % | 0.86 | 134 |
| var 7:e dag | 18 % | 0.85 | 40 |
| var 30:e dag | 17 % | 0.74 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 1.90 | 12 % | -12 % | 1.03 |
| Trendkorg SMA 50, ombalans var 1:e dag | 1.80 | 13 % | -10 % | 1.35 |
| Trendkorg SMA 150, ombalans var 1:e dag | 1.80 | 14 % | -9 % | 1.60 |
| Trendkorg SMA 50, ombalans var 7:e dag | 1.72 | 15 % | -10 % | 1.53 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 1.68 | 14 % | -12 % | 1.13 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 1.60 | 11 % | -13 % | 0.84 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 20 % | -19 % | 1.09 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 23 % | -21 % | 1.10 |

### Slutsats (automatisk)

- Av 32 strategier slog 17 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 17 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 4 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -21 % mot -39 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
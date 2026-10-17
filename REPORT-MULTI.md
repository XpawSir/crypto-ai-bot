# Flerslagstest: daglig trendföljning

## A: ETF:er + Bitcoin (från 2015)

Skapad 2026-10-17 12:58 UTC. Period 2015-09-08 – 2026-10-17 (delningsdatum för håll-ut-test: 2021-03-29). Tillgångar: SPY, QQQ, EFA, EEM, TLT, GLD, DBC, VNQ, BTC-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 365 % | 15 % | -34 % | 0.87 | 0.44 |
| Köp och behåll lika delar (månadsvis ombalans) | 570 % | 19 % | -29 % | 1.26 | 0.64 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 154 % | 9 % | -28 % | 0.81 | 0.32 |
| Köp och behåll Bitcoin | 33352 % | 69 % | -83 % | 1.13 | 0.82 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 345 % | 14 % | -11 % | 1.47 | 1.31 | 40 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 313 % | 14 % | -12 % | 1.39 | 1.12 | 96 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 162 % | 9 % | -8 % | 1.23 | 1.10 | 49 |
| Trendkorg SMA 200, ombalans var 1:e dag | 286 % | 13 % | -12 % | 1.35 | 1.04 | 98 |
| Trendkorg SMA 100, ombalans var 7:e dag | 335 % | 14 % | -14 % | 1.51 | 1.02 | 42 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 318 % | 14 % | -14 % | 1.39 | 0.97 | 39 |
| Trendkorg SMA 150, ombalans var 7:e dag | 305 % | 13 % | -14 % | 1.40 | 0.96 | 41 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 331 % | 14 % | -15 % | 1.38 | 0.95 | 97 |
| Dubbelmomentum 90d, topp 3, filter SMA 200 (veckovis) | 1269 % | 27 % | -29 % | 1.24 | 0.93 | 39 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 316 % | 14 % | -15 % | 1.42 | 0.91 | 40 |
| Trendkorg SMA 150, ombalans var 1:e dag | 295 % | 13 % | -15 % | 1.40 | 0.91 | 103 |
| Riskviktad trend SMA 200, ombalans var 1:e dag | 129 % | 8 % | -9 % | 1.08 | 0.90 | 169 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 13 % | -16 % | 11/12 / 11/12 / 9/12 | 12/12 / 12/12 / 2/12 |
| Tidsserie-momentum | 12 | 14 % | -18 % | 11/12 / 9/12 / 8/12 | 12/12 / 12/12 / 5/12 |
| Riskviktad trend | 4 | 8 % | -10 % | 3/4 / 3/4 / 3/4 | 4/4 / 4/4 / 2/4 |
| Dubbelmomentum | 4 | 28 % | -35 % | 3/4 / 4/4 / 1/4 | 4/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 12 % | 0.87 | 118 |
| var 7:e dag | 14 % | 0.94 | 42 |
| var 30:e dag | 13 % | 0.70 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 1.98 | 7 % | -11 % | 0.69 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 1.86 | 7 % | -14 % | 0.51 |
| Trendkorg SMA 100, ombalans var 7:e dag | 1.80 | 7 % | -14 % | 0.48 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 1.78 | 8 % | -12 % | 0.64 |
| Tidsserie-momentum 60d, ombalans var 1:e dag | 1.77 | 4 % | -19 % | 0.22 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 1.65 | 6 % | -8 % | 0.78 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 14 % | -25 % | 0.57 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 11 % | -29 % | 0.39 |

### Slutsats (automatisk)

- Av 32 strategier slog 21 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 9 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 5 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -16 % mot -29 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

## B: ETF:er + Bitcoin + Ethereum (från 2018)

Skapad 2026-10-17 12:58 UTC. Period 2018-09-08 – 2026-10-17 (delningsdatum för håll-ut-test: 2022-09-28). Tillgångar: SPY, QQQ, TLT, GLD, DBC, BTC-USD, ETH-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 201 % | 15 % | -34 % | 0.80 | 0.43 |
| Köp och behåll lika delar (månadsvis ombalans) | 550 % | 26 % | -39 % | 1.10 | 0.66 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 90 % | 8 % | -28 % | 0.71 | 0.30 |
| Köp och behåll Bitcoin | 1209 % | 37 % | -77 % | 0.83 | 0.49 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Tidsserie-momentum 250d, ombalans var 7:e dag | 370 % | 21 % | -16 % | 1.24 | 1.32 | 40 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 405 % | 22 % | -17 % | 1.35 | 1.27 | 39 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 297 % | 19 % | -17 % | 1.12 | 1.12 | 127 |
| Trendkorg SMA 50, ombalans var 7:e dag | 377 % | 21 % | -19 % | 1.36 | 1.12 | 45 |
| Tidsserie-momentum 120d, ombalans var 30:e dag | 362 % | 21 % | -20 % | 1.19 | 1.04 | 11 |
| Trendkorg SMA 150, ombalans var 1:e dag | 390 % | 22 % | -21 % | 1.35 | 1.03 | 122 |
| Tidsserie-momentum 250d, ombalans var 30:e dag | 301 % | 19 % | -18 % | 1.08 | 1.01 | 11 |
| Tidsserie-momentum 120d, ombalans var 1:e dag | 336 % | 20 % | -21 % | 1.23 | 0.96 | 130 |
| Trendkorg SMA 50, ombalans var 30:e dag | 314 % | 19 % | -20 % | 1.19 | 0.95 | 12 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 144 % | 12 % | -12 % | 1.31 | 0.93 | 47 |
| Trendkorg SMA 200, ombalans var 1:e dag | 313 % | 19 % | -21 % | 1.20 | 0.93 | 118 |
| Dubbelmomentum 90d, topp 2, filter SMA 200 (veckovis) | 2328 % | 48 % | -52 % | 1.12 | 0.92 | 33 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 19 % | -23 % | 11/12 / 12/12 / 9/12 | 12/12 / 12/12 / 10/12 |
| Tidsserie-momentum | 12 | 19 % | -20 % | 9/12 / 11/12 / 2/12 | 12/12 / 12/12 / 2/12 |
| Riskviktad trend | 4 | 11 % | -14 % | 4/4 / 4/4 / 4/4 | 4/4 / 4/4 / 4/4 |
| Dubbelmomentum | 4 | 27 % | -51 % | 2/4 / 2/4 / 2/4 | 2/4 / 4/4 / 2/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 19 % | 0.89 | 134 |
| var 7:e dag | 19 % | 0.88 | 40 |
| var 30:e dag | 18 % | 0.76 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 1.92 | 14 % | -12 % | 1.12 |
| Trendkorg SMA 50, ombalans var 1:e dag | 1.82 | 14 % | -10 % | 1.35 |
| Trendkorg SMA 150, ombalans var 1:e dag | 1.81 | 15 % | -9 % | 1.74 |
| Trendkorg SMA 50, ombalans var 7:e dag | 1.74 | 15 % | -10 % | 1.56 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 1.67 | 15 % | -12 % | 1.27 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 1.59 | 13 % | -13 % | 0.96 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 21 % | -19 % | 1.12 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 24 % | -21 % | 1.17 |

### Slutsats (automatisk)

- Av 32 strategier slog 17 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 18 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 4 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -21 % mot -39 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
# Flerslagstest: daglig trendföljning

## A: ETF:er + Bitcoin (från 2015)

Skapad 2026-11-01 10:27 UTC. Period 2015-09-08 – 2026-11-01 (delningsdatum för håll-ut-test: 2021-04-05). Tillgångar: SPY, QQQ, EFA, EEM, TLT, GLD, DBC, VNQ, BTC-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 361 % | 15 % | -34 % | 0.87 | 0.43 |
| Köp och behåll lika delar (månadsvis ombalans) | 561 % | 18 % | -29 % | 1.24 | 0.63 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 155 % | 9 % | -28 % | 0.81 | 0.32 |
| Köp och behåll Bitcoin | 31942 % | 68 % | -83 % | 1.12 | 0.81 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 342 % | 14 % | -11 % | 1.46 | 1.29 | 40 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 308 % | 13 % | -12 % | 1.37 | 1.11 | 96 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 160 % | 9 % | -8 % | 1.22 | 1.09 | 49 |
| Trendkorg SMA 200, ombalans var 1:e dag | 281 % | 13 % | -12 % | 1.33 | 1.02 | 98 |
| Trendkorg SMA 100, ombalans var 7:e dag | 333 % | 14 % | -14 % | 1.50 | 1.01 | 42 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 314 % | 14 % | -14 % | 1.37 | 0.96 | 39 |
| Trendkorg SMA 150, ombalans var 7:e dag | 303 % | 13 % | -14 % | 1.39 | 0.95 | 41 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 327 % | 14 % | -15 % | 1.37 | 0.94 | 97 |
| Dubbelmomentum 90d, topp 3, filter SMA 200 (veckovis) | 1232 % | 26 % | -29 % | 1.23 | 0.91 | 39 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 312 % | 14 % | -15 % | 1.40 | 0.90 | 40 |
| Trendkorg SMA 150, ombalans var 1:e dag | 290 % | 13 % | -15 % | 1.39 | 0.89 | 103 |
| Riskviktad trend SMA 200, ombalans var 1:e dag | 126 % | 8 % | -9 % | 1.06 | 0.89 | 169 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 13 % | -16 % | 11/12 / 11/12 / 9/12 | 12/12 / 12/12 / 2/12 |
| Tidsserie-momentum | 12 | 13 % | -18 % | 11/12 / 9/12 / 8/12 | 12/12 / 12/12 / 5/12 |
| Riskviktad trend | 4 | 8 % | -10 % | 3/4 / 3/4 / 3/4 | 4/4 / 4/4 / 2/4 |
| Dubbelmomentum | 4 | 28 % | -35 % | 3/4 / 4/4 / 1/4 | 4/4 / 4/4 / 0/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 12 % | 0.85 | 118 |
| var 7:e dag | 14 % | 0.93 | 42 |
| var 30:e dag | 13 % | 0.69 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Trendkorg SMA 200, ombalans var 7:e dag | 1.99 | 7 % | -11 % | 0.65 |
| Tidsserie-momentum 180d, ombalans var 7:e dag | 1.88 | 7 % | -14 % | 0.47 |
| Trendkorg SMA 100, ombalans var 7:e dag | 1.80 | 6 % | -14 % | 0.46 |
| Tidsserie-momentum 180d, ombalans var 1:e dag | 1.80 | 7 % | -12 % | 0.59 |
| Tidsserie-momentum 60d, ombalans var 1:e dag | 1.78 | 4 % | -19 % | 0.19 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 1.67 | 6 % | -8 % | 0.73 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 13 % | -25 % | 0.54 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 11 % | -29 % | 0.36 |

### Slutsats (automatisk)

- Av 32 strategier slog 21 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 9 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 5 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -16 % mot -29 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

## B: ETF:er + Bitcoin + Ethereum (från 2018)

Skapad 2026-11-01 10:27 UTC. Period 2018-09-08 – 2026-11-01 (delningsdatum för håll-ut-test: 2022-10-05). Tillgångar: SPY, QQQ, TLT, GLD, DBC, BTC-USD, ETH-USD. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre avkastning per risk), Sharpe = avkastning per svängning, Affärsdagar/år = hur många dagar om året som boten faktiskt handlar.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Köp och behåll SPY (S&P 500) | 198 % | 14 % | -34 % | 0.79 | 0.42 |
| Köp och behåll lika delar (månadsvis ombalans) | 532 % | 25 % | -39 % | 1.08 | 0.65 |
| Köp och behåll 60/40 (SPY/TLT, månadsvis ombalans) | 91 % | 8 % | -28 % | 0.71 | 0.30 |
| Köp och behåll Bitcoin | 1154 % | 36 % | -77 % | 0.82 | 0.47 |

### Topp 12 av 32 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar | Affärsdagar/år |
|---|---|---|---|---|---|---|
| Tidsserie-momentum 250d, ombalans var 7:e dag | 360 % | 21 % | -16 % | 1.22 | 1.29 | 40 |
| Tidsserie-momentum 120d, ombalans var 7:e dag | 397 % | 22 % | -17 % | 1.33 | 1.25 | 39 |
| Trendkorg SMA 50, ombalans var 7:e dag | 377 % | 21 % | -19 % | 1.36 | 1.11 | 45 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 289 % | 18 % | -17 % | 1.10 | 1.09 | 126 |
| Tidsserie-momentum 120d, ombalans var 30:e dag | 355 % | 20 % | -20 % | 1.17 | 1.03 | 12 |
| Trendkorg SMA 150, ombalans var 1:e dag | 378 % | 21 % | -21 % | 1.32 | 1.01 | 122 |
| Tidsserie-momentum 250d, ombalans var 30:e dag | 296 % | 18 % | -18 % | 1.07 | 1.00 | 11 |
| Tidsserie-momentum 120d, ombalans var 1:e dag | 325 % | 19 % | -21 % | 1.20 | 0.94 | 130 |
| Trendkorg SMA 50, ombalans var 30:e dag | 310 % | 19 % | -20 % | 1.18 | 0.94 | 12 |
| Riskviktad trend SMA 200, ombalans var 7:e dag | 141 % | 11 % | -12 % | 1.29 | 0.91 | 47 |
| Trendkorg SMA 200, ombalans var 1:e dag | 302 % | 19 % | -21 % | 1.18 | 0.90 | 118 |
| Dubbelmomentum 90d, topp 2, filter SMA 200 (veckovis) | 2200 % | 47 % | -52 % | 1.10 | 0.90 | 33 |

### Robusthet: hela rutnätet, inte bara de bästa

| Familj | Antal | Median-CAGR | Median Max ned | Slår köp och behåll lika delar på Calmar (hela / 1:a halvan / 2:a halvan) | Slår SPY (S&P 500) på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Trendkorg | 12 | 19 % | -23 % | 11/12 / 12/12 / 9/12 | 12/12 / 12/12 / 9/12 |
| Tidsserie-momentum | 12 | 18 % | -20 % | 9/12 / 11/12 / 2/12 | 12/12 / 12/12 / 3/12 |
| Riskviktad trend | 4 | 11 % | -14 % | 4/4 / 4/4 / 4/4 | 4/4 / 4/4 / 4/4 |
| Dubbelmomentum | 4 | 27 % | -51 % | 2/4 / 2/4 / 2/4 | 2/4 / 4/4 / 2/4 |

### Daglig eller långsammare ombalansering?

| Ombalans | Median-CAGR | Median Calmar | Median affärsdagar/år |
|---|---|---|---|
| var 1:e dag | 19 % | 0.87 | 134 |
| var 7:e dag | 19 % | 0.86 | 40 |
| var 30:e dag | 18 % | 0.75 | 12 |

### Håll-ut-test

Bästa strategierna på första halvan (efter Calmar), mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Tidsserie-momentum 120d, ombalans var 7:e dag | 1.90 | 13 % | -12 % | 1.07 |
| Trendkorg SMA 50, ombalans var 1:e dag | 1.81 | 13 % | -10 % | 1.34 |
| Trendkorg SMA 150, ombalans var 1:e dag | 1.80 | 14 % | -9 % | 1.65 |
| Trendkorg SMA 50, ombalans var 7:e dag | 1.73 | 15 % | -10 % | 1.55 |
| Tidsserie-momentum 250d, ombalans var 7:e dag | 1.68 | 15 % | -12 % | 1.20 |
| Tidsserie-momentum 250d, ombalans var 1:e dag | 1.60 | 12 % | -13 % | 0.90 |
| *Köp och behåll SPY (S&P 500) (2:a halvan)* | | 20 % | -19 % | 1.07 |
| *Köp och behåll lika delar (månadsvis ombalans) (2:a halvan)* | | 23 % | -21 % | 1.10 |

### Slutsats (automatisk)

- Av 32 strategier slog 17 köp och behåll lika delar på avkastning per risk (Calmar) på andra halvan, och 18 slog SPY (S&P 500).
- De 6 som var bäst på första halvan slog lika delar på Calmar i 4 av 6 och på tillväxt (CAGR) i 0 av 6 på andra halvan.
- Mediannedgången var -21 % mot -39 % för lika delar och -34 % för SPY (S&P 500).

Läs med försiktighet: många varianter ger risk för tur, få tillgångar och få marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
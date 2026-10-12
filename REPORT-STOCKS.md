# Aktier och ETF:er: portföljtest

## Amerikanska ETF:er (index, sektorer, obligationer, guld)

Skapad 2026-10-12 20:32 UTC. Period 2009-09-09 – 2026-10-12 (delningsdatum för håll-ut-test: 2018-03-27). Instrument: SPY, QQQ, IWM, EFA, EEM, TLT, GLD, XLK, XLF, XLE, XLV, XLY, XLP, XLI, XLU, XLB. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
ETF:er har litet överlevnadsfel men perioden efter 2009 var en lång uppgångsperiod för amerikanska aktier, vilket gynnar buy & hold.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold SPY (S&P 500) | 919 % | 15 % | -34 % | 0.88 | 0.43 |
| Buy & hold lika delar (månadsvis ombalans) | 590 % | 12 % | -31 % | 0.85 | 0.39 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 263 % | 8 % | -13 % | 0.81 | 0.60 |
| Lika delar när SPY > SMA 200 | 274 % | 8 % | -17 % | 0.80 | 0.48 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 160 % | 6 % | -13 % | 0.70 | 0.45 |
| Trendkorg (varje instrument över SMA 200) | 165 % | 6 % | -13 % | 0.71 | 0.45 |
| Lika delar när SPY > SMA 100 | 164 % | 6 % | -16 % | 0.63 | 0.35 |
| Momentum 120d, topp 3, trendfilter 100 | 272 % | 8 % | -23 % | 0.61 | 0.35 |
| Lika delar när SPY > SMA 100, volatilitetsstyrd | 149 % | 5 % | -16 % | 0.62 | 0.33 |
| Momentum 120d, topp 3, utan filter | 284 % | 8 % | -25 % | 0.61 | 0.33 |
| Momentum 30d, topp 3, trendfilter 200, volatilitetsstyrd | 138 % | 5 % | -16 % | 0.48 | 0.32 |
| Momentum 120d, topp 3, trendfilter 200 | 274 % | 8 % | -25 % | 0.60 | 0.32 |
| Momentum 120d, topp 3, trendfilter 100, volatilitetsstyrd | 213 % | 7 % | -22 % | 0.58 | 0.31 |
| Momentum 30d, topp 3, trendfilter 200 | 169 % | 6 % | -19 % | 0.50 | 0.31 |

### Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold SPY (S&P 500) på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 5 % | -29 % | 0/72 / 0/72 / 3/72 | 0/72 / 0/72 / 9/72 |
| Trendkorg | 6 | 3 % | -13 % | 2/6 / 0/6 / 0/6 | 2/6 / 0/6 / 2/6 |
| Marknadsfilter | 4 | 7 % | -16 % | 2/4 / 0/4 / 4/4 | 2/4 / 0/4 / 4/4 |

### Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 0.53 | 9 % | -13 % | 0.68 |
| Trendkorg (varje instrument över SMA 200) | 0.50 | 6 % | -13 % | 0.44 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 0.48 | 6 % | -13 % | 0.45 |
| Momentum 90d, topp 3, utan filter | 0.42 | 5 % | -31 % | 0.17 |
| Momentum 120d, topp 3, utan filter | 0.41 | 10 % | -25 % | 0.41 |
| *Buy & hold SPY (S&P 500) (2:a halvan)* | | 15 % | -34 % | 0.46 |
| *Lika delar (2:a halvan)* | | 12 % | -31 % | 0.39 |

### Slutsats (automatisk)

- Av 82 strategier slog 7 buy & hold SPY (S&P 500) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog SPY (S&P 500) på Calmar i 1 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -28 % mot -34 % för buy & hold SPY (S&P 500): strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

## Stora svenska aktier

Skapad 2026-10-12 20:32 UTC. Period 2009-09-09 – 2026-10-12 (delningsdatum för håll-ut-test: 2018-03-27). Instrument: INVE-B.ST, VOLV-B.ST, ERIC-B.ST, ATCO-A.ST, SEB-A.ST, HM-B.ST, SAND.ST, ASSA-B.ST, ABB.ST, ALFA.ST, SHB-A.ST, SWED-A.ST, EVO.ST, HEXA-B.ST, ESSITY-B.ST. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
**Överlevnadsfel:** aktierna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold Investor B (index-ersättare) | 1877 % | 19 % | -32 % | 0.94 | 0.59 |
| Buy & hold lika delar (månadsvis ombalans) | 1229 % | 16 % | -33 % | 0.88 | 0.49 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 90d, topp 1, trendfilter 100 | 3149 % | 23 % | -49 % | 0.80 | 0.46 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 812 % | 14 % | -33 % | 0.85 | 0.41 |
| Momentum 90d, topp 2, trendfilter 100, volatilitetsstyrd | 628 % | 12 % | -31 % | 0.80 | 0.40 |
| Momentum 90d, topp 1, utan filter | 3415 % | 23 % | -59 % | 0.81 | 0.39 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 465 % | 11 % | -28 % | 0.67 | 0.39 |
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 867 % | 14 % | -38 % | 0.86 | 0.38 |
| Momentum 90d, topp 2, trendfilter 100 | 1089 % | 16 % | -42 % | 0.74 | 0.37 |
| Momentum 120d, topp 1, utan filter | 1466 % | 17 % | -49 % | 0.66 | 0.36 |
| Momentum 90d, topp 2, utan filter, volatilitetsstyrd | 626 % | 12 % | -35 % | 0.80 | 0.35 |
| Momentum 90d, topp 3, trendfilter 100, volatilitetsstyrd | 501 % | 11 % | -32 % | 0.76 | 0.34 |
| Momentum 90d, topp 2, utan filter | 1080 % | 16 % | -46 % | 0.73 | 0.33 |
| Lika delar när INVE-B.ST > SMA 200 | 357 % | 9 % | -28 % | 0.70 | 0.33 |

### Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold Investor B (index-ersättare) på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 8 % | -38 % | 0/72 / 4/72 / 0/72 | 0/72 / 12/72 / 0/72 |
| Trendkorg | 6 | 4 % | -22 % | 0/6 / 0/6 / 0/6 | 0/6 / 0/6 / 0/6 |
| Marknadsfilter | 4 | 7 % | -27 % | 0/4 / 0/4 / 2/4 | 0/4 / 0/4 / 4/4 |

### Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 0.94 | 11 % | -38 % | 0.30 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 0.90 | 11 % | -33 % | 0.34 |
| Momentum 90d, topp 1, utan filter | 0.88 | 17 % | -59 % | 0.28 |
| Momentum 90d, topp 1, trendfilter 100 | 0.85 | 16 % | -49 % | 0.32 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 0.55 | 7 % | -31 % | 0.22 |
| *Buy & hold Investor B (index-ersättare) (2:a halvan)* | | 22 % | -32 % | 0.68 |
| *Lika delar (2:a halvan)* | | 17 % | -33 % | 0.51 |

### Slutsats (automatisk)

- Av 82 strategier slog 2 buy & hold Investor B (index-ersättare) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog Investor B (index-ersättare) på Calmar i 0 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -35 % mot -32 % för buy & hold Investor B (index-ersättare): ingen minskning av riskerna.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
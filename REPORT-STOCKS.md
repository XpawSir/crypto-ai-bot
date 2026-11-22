# Aktier och ETF:er: portföljtest

## Amerikanska ETF:er (index, sektorer, obligationer, guld)

Skapad 2026-11-22 11:19 UTC. Period 2009-09-09 – 2026-11-20 (delningsdatum för håll-ut-test: 2018-04-16). Instrument: SPY, QQQ, IWM, EFA, EEM, TLT, GLD, XLK, XLF, XLE, XLV, XLY, XLP, XLI, XLU, XLB. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
ETF:er har litet överlevnadsfel men perioden efter 2009 var en lång uppgångsperiod för amerikanska aktier, vilket gynnar buy & hold.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold SPY (S&P 500) | 803 % | 14 % | -34 % | 0.84 | 0.40 |
| Buy & hold lika delar (månadsvis ombalans) | 545 % | 11 % | -31 % | 0.82 | 0.37 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 266 % | 8 % | -13 % | 0.81 | 0.60 |
| Lika delar när SPY > SMA 200 | 278 % | 8 % | -17 % | 0.80 | 0.48 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 153 % | 6 % | -13 % | 0.68 | 0.44 |
| Trendkorg (varje instrument över SMA 200) | 159 % | 6 % | -13 % | 0.69 | 0.43 |
| Lika delar när SPY > SMA 100 | 168 % | 6 % | -16 % | 0.63 | 0.36 |
| Lika delar när SPY > SMA 100, volatilitetsstyrd | 153 % | 6 % | -16 % | 0.63 | 0.34 |
| Momentum 120d, topp 3, trendfilter 100 | 251 % | 8 % | -23 % | 0.58 | 0.33 |
| Momentum 120d, topp 3, utan filter | 278 % | 8 % | -25 % | 0.60 | 0.32 |
| Momentum 120d, topp 3, trendfilter 200 | 268 % | 8 % | -25 % | 0.59 | 0.32 |
| Momentum 30d, topp 3, trendfilter 200, volatilitetsstyrd | 125 % | 5 % | -16 % | 0.45 | 0.30 |
| Momentum 120d, topp 3, trendfilter 100, volatilitetsstyrd | 200 % | 7 % | -22 % | 0.56 | 0.30 |
| Momentum 30d, topp 3, trendfilter 200 | 151 % | 5 % | -19 % | 0.46 | 0.28 |

### Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold SPY (S&P 500) på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 4 % | -29 % | 0/72 / 0/72 / 5/72 | 0/72 / 0/72 / 10/72 |
| Trendkorg | 6 | 3 % | -13 % | 2/6 / 0/6 / 2/6 | 2/6 / 0/6 / 2/6 |
| Marknadsfilter | 4 | 7 % | -16 % | 2/4 / 0/4 / 4/4 | 2/4 / 0/4 / 4/4 |

### Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 0.52 | 9 % | -13 % | 0.69 |
| Trendkorg (varje instrument över SMA 200) | 0.48 | 5 % | -13 % | 0.42 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 0.46 | 5 % | -13 % | 0.42 |
| Momentum 90d, topp 3, utan filter | 0.40 | 4 % | -31 % | 0.12 |
| Momentum 90d, topp 3, utan filter, volatilitetsstyrd | 0.39 | 4 % | -24 % | 0.15 |
| *Buy & hold SPY (S&P 500) (2:a halvan)* | | 13 % | -34 % | 0.40 |
| *Lika delar (2:a halvan)* | | 11 % | -31 % | 0.35 |

### Slutsats (automatisk)

- Av 82 strategier slog 11 buy & hold SPY (S&P 500) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog SPY (S&P 500) på Calmar i 3 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -28 % mot -34 % för buy & hold SPY (S&P 500): strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

## Stora svenska aktier

Skapad 2026-11-22 11:19 UTC. Period 2009-09-09 – 2026-11-20 (delningsdatum för håll-ut-test: 2018-04-16). Instrument: INVE-B.ST, VOLV-B.ST, ERIC-B.ST, ATCO-A.ST, SEB-A.ST, HM-B.ST, SAND.ST, ASSA-B.ST, ABB.ST, ALFA.ST, SHB-A.ST, SWED-A.ST, EVO.ST, HEXA-B.ST, ESSITY-B.ST. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
**Överlevnadsfel:** aktierna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold Investor B (index-ersättare) | 1861 % | 19 % | -32 % | 0.93 | 0.59 |
| Buy & hold lika delar (månadsvis ombalans) | 1209 % | 16 % | -33 % | 0.87 | 0.48 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 90d, topp 1, trendfilter 100 | 3173 % | 22 % | -49 % | 0.80 | 0.45 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 820 % | 14 % | -33 % | 0.84 | 0.41 |
| Momentum 90d, topp 1, utan filter | 3441 % | 23 % | -59 % | 0.81 | 0.39 |
| Momentum 90d, topp 2, trendfilter 100, volatilitetsstyrd | 619 % | 12 % | -31 % | 0.79 | 0.39 |
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 876 % | 14 % | -38 % | 0.86 | 0.38 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 430 % | 10 % | -28 % | 0.65 | 0.37 |
| Momentum 90d, topp 2, trendfilter 100 | 1072 % | 15 % | -42 % | 0.74 | 0.37 |
| Momentum 90d, topp 2, utan filter, volatilitetsstyrd | 617 % | 12 % | -35 % | 0.79 | 0.34 |
| Momentum 120d, topp 1, utan filter | 1339 % | 17 % | -49 % | 0.64 | 0.34 |
| Momentum 90d, topp 3, trendfilter 100, volatilitetsstyrd | 483 % | 11 % | -32 % | 0.74 | 0.33 |
| Momentum 90d, topp 2, utan filter | 1063 % | 15 % | -46 % | 0.72 | 0.33 |
| Lika delar när INVE-B.ST > SMA 200 | 350 % | 9 % | -28 % | 0.69 | 0.32 |

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
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 0.96 | 11 % | -38 % | 0.30 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 0.92 | 11 % | -33 % | 0.33 |
| Momentum 90d, topp 1, utan filter | 0.89 | 16 % | -59 % | 0.28 |
| Momentum 90d, topp 1, trendfilter 100 | 0.86 | 16 % | -49 % | 0.32 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 0.57 | 6 % | -31 % | 0.19 |
| *Buy & hold Investor B (index-ersättare) (2:a halvan)* | | 21 % | -32 % | 0.66 |
| *Lika delar (2:a halvan)* | | 17 % | -33 % | 0.50 |

### Slutsats (automatisk)

- Av 82 strategier slog 2 buy & hold Investor B (index-ersättare) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog Investor B (index-ersättare) på Calmar i 0 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -35 % mot -32 % för buy & hold Investor B (index-ersättare): ingen minskning av riskerna.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
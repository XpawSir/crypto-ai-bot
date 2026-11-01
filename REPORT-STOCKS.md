# Aktier och ETF:er: portföljtest

## Amerikanska ETF:er (index, sektorer, obligationer, guld)

Skapad 2026-11-01 10:27 UTC. Period 2009-09-09 – 2026-10-30 (delningsdatum för håll-ut-test: 2018-04-05). Instrument: SPY, QQQ, IWM, EFA, EEM, TLT, GLD, XLK, XLF, XLE, XLV, XLY, XLP, XLI, XLU, XLB. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
ETF:er har litet överlevnadsfel men perioden efter 2009 var en lång uppgångsperiod för amerikanska aktier, vilket gynnar buy & hold.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold SPY (S&P 500) | 889 % | 14 % | -34 % | 0.87 | 0.42 |
| Buy & hold lika delar (månadsvis ombalans) | 594 % | 12 % | -31 % | 0.85 | 0.39 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 264 % | 8 % | -13 % | 0.81 | 0.60 |
| Lika delar när SPY > SMA 200 | 276 % | 8 % | -17 % | 0.80 | 0.48 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 159 % | 6 % | -13 % | 0.70 | 0.45 |
| Trendkorg (varje instrument över SMA 200) | 165 % | 6 % | -13 % | 0.70 | 0.44 |
| Lika delar när SPY > SMA 100 | 165 % | 6 % | -16 % | 0.63 | 0.36 |
| Momentum 120d, topp 3, trendfilter 100 | 282 % | 8 % | -23 % | 0.62 | 0.35 |
| Momentum 120d, topp 3, utan filter | 298 % | 8 % | -25 % | 0.62 | 0.33 |
| Lika delar när SPY > SMA 100, volatilitetsstyrd | 150 % | 5 % | -16 % | 0.62 | 0.33 |
| Momentum 120d, topp 3, trendfilter 200 | 288 % | 8 % | -25 % | 0.62 | 0.33 |
| Momentum 30d, topp 3, trendfilter 200, volatilitetsstyrd | 138 % | 5 % | -16 % | 0.48 | 0.32 |
| Momentum 120d, topp 3, trendfilter 100, volatilitetsstyrd | 221 % | 7 % | -22 % | 0.59 | 0.32 |
| Momentum 30d, topp 3, trendfilter 200 | 169 % | 6 % | -19 % | 0.50 | 0.31 |

### Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold SPY (S&P 500) på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 5 % | -29 % | 0/72 / 0/72 / 5/72 | 0/72 / 0/72 / 11/72 |
| Trendkorg | 6 | 3 % | -13 % | 2/6 / 0/6 / 2/6 | 2/6 / 0/6 / 2/6 |
| Marknadsfilter | 4 | 7 % | -16 % | 2/4 / 0/4 / 4/4 | 2/4 / 0/4 / 4/4 |

### Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Lika delar när SPY > SMA 200, volatilitetsstyrd | 0.52 | 9 % | -13 % | 0.69 |
| Trendkorg (varje instrument över SMA 200) | 0.49 | 6 % | -13 % | 0.44 |
| Trendkorg (varje instrument över SMA 200), volatilitetsstyrd | 0.47 | 6 % | -13 % | 0.45 |
| Momentum 90d, topp 3, utan filter | 0.40 | 5 % | -31 % | 0.16 |
| Momentum 120d, topp 3, utan filter | 0.39 | 11 % | -25 % | 0.42 |
| *Buy & hold SPY (S&P 500) (2:a halvan)* | | 15 % | -34 % | 0.44 |
| *Lika delar (2:a halvan)* | | 12 % | -31 % | 0.39 |

### Slutsats (automatisk)

- Av 82 strategier slog 11 buy & hold SPY (S&P 500) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog SPY (S&P 500) på Calmar i 3 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -28 % mot -34 % för buy & hold SPY (S&P 500): strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

## Stora svenska aktier

Skapad 2026-11-01 10:27 UTC. Period 2009-09-09 – 2026-10-30 (delningsdatum för håll-ut-test: 2018-04-05). Instrument: INVE-B.ST, VOLV-B.ST, ERIC-B.ST, ATCO-A.ST, SEB-A.ST, HM-B.ST, SAND.ST, ASSA-B.ST, ABB.ST, ALFA.ST, SHB-A.ST, SWED-A.ST, EVO.ST, HEXA-B.ST, ESSITY-B.ST. Kostnad 0,10 % per handlad krona. Signaler fördröjda en dag. Justerade kurser (utdelning ingår).
**Överlevnadsfel:** aktierna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

### Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold Investor B (index-ersättare) | 1944 % | 19 % | -32 % | 0.95 | 0.60 |
| Buy & hold lika delar (månadsvis ombalans) | 1237 % | 16 % | -33 % | 0.88 | 0.49 |

### Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 90d, topp 1, trendfilter 100 | 3278 % | 23 % | -49 % | 0.81 | 0.46 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 838 % | 14 % | -33 % | 0.85 | 0.42 |
| Momentum 90d, topp 2, trendfilter 100, volatilitetsstyrd | 657 % | 13 % | -31 % | 0.82 | 0.40 |
| Momentum 90d, topp 1, utan filter | 3555 % | 23 % | -59 % | 0.82 | 0.40 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 466 % | 11 % | -28 % | 0.67 | 0.39 |
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 895 % | 14 % | -38 % | 0.87 | 0.38 |
| Momentum 90d, topp 2, trendfilter 100 | 1142 % | 16 % | -42 % | 0.75 | 0.38 |
| Momentum 120d, topp 1, utan filter | 1486 % | 17 % | -49 % | 0.66 | 0.36 |
| Momentum 90d, topp 2, utan filter, volatilitetsstyrd | 654 % | 13 % | -35 % | 0.81 | 0.35 |
| Momentum 90d, topp 3, trendfilter 100, volatilitetsstyrd | 506 % | 11 % | -32 % | 0.76 | 0.34 |
| Momentum 90d, topp 2, utan filter | 1133 % | 16 % | -46 % | 0.74 | 0.34 |
| Lika delar när INVE-B.ST > SMA 200 | 359 % | 9 % | -28 % | 0.70 | 0.33 |

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
| Momentum 90d, topp 1, utan filter, volatilitetsstyrd | 0.94 | 12 % | -38 % | 0.31 |
| Momentum 90d, topp 1, trendfilter 100, volatilitetsstyrd | 0.90 | 12 % | -33 % | 0.35 |
| Momentum 90d, topp 1, utan filter | 0.88 | 17 % | -59 % | 0.29 |
| Momentum 90d, topp 1, trendfilter 100 | 0.85 | 16 % | -49 % | 0.33 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 0.54 | 7 % | -31 % | 0.22 |
| *Buy & hold Investor B (index-ersättare) (2:a halvan)* | | 22 % | -32 % | 0.68 |
| *Lika delar (2:a halvan)* | | 17 % | -33 % | 0.51 |

### Slutsats (automatisk)

- Av 82 strategier slog 2 buy & hold Investor B (index-ersättare) på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog Investor B (index-ersättare) på Calmar i 0 av 5 och på tillväxt (CAGR) i 0 av 5 på andra halvan.
- Mediannedgången var -35 % mot -32 % för buy & hold Investor B (index-ersättare): ingen minskning av riskerna.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.

Historik garanterar ingenting, och inget här är finansiell rådgivning. Alla resultat är simuleringar.
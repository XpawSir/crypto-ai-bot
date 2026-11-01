# Portföljtest: rotation mellan flera valutor

Skapad 2026-11-01 10:27 UTC. Period 2019-09-08 – 2026-10-31 (delningsdatum för håll-ut-test: 2023-04-05). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 648 % | 32 % | -77 % | 0.77 | 0.42 |
| Buy & hold lika delar (månadsvis ombalans) | 3774 % | 67 % | -76 % | 1.06 | 0.88 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 15724 % | 103 % | -65 % | 1.17 | 1.58 |
| Momentum 120d, topp 1, utan filter | 28900 % | 121 % | -85 % | 1.24 | 1.42 |
| Momentum 120d, topp 3, trendfilter 100 | 11873 % | 95 % | -69 % | 1.14 | 1.38 |
| Trendkorg (varje valuta över SMA 50) | 4950 % | 73 % | -53 % | 1.38 | 1.37 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 6818 % | 81 % | -61 % | 1.31 | 1.33 |
| Momentum 60d, topp 3, trendfilter 200 | 6565 % | 80 % | -63 % | 1.05 | 1.26 |
| Momentum 90d, topp 3, trendfilter 100 | 10733 % | 93 % | -75 % | 1.12 | 1.24 |
| Momentum 120d, topp 3, trendfilter 200 | 8513 % | 86 % | -71 % | 1.08 | 1.22 |
| Lika delar när BTC > SMA 100 | 4762 % | 72 % | -60 % | 1.24 | 1.20 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3879 % | 67 % | -61 % | 1.20 | 1.11 |
| Momentum 120d, topp 3, utan filter, volatilitetsstyrd | 3379 % | 64 % | -58 % | 1.22 | 1.10 |
| Momentum 120d, topp 2, utan filter | 6884 % | 81 % | -76 % | 1.11 | 1.07 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 50 % | -68 % | 64/72 / 61/72 / 70/72 | 23/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 48 % | -53 % | 6/6 / 6/6 / 1/6 | 3/6 / 2/6 / 5/6 |
| Marknadsfilter | 4 | 48 % | -58 % | 4/4 / 4/4 / 0/4 | 1/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.03 | 38 % | -56 % | 0.68 |
| Trendkorg (varje valuta över SMA 50) | 2.72 | 22 % | -43 % | 0.52 |
| Momentum 120d, topp 3, trendfilter 100 | 2.53 | 44 % | -40 % | 1.10 |
| Lika delar när BTC > SMA 100 | 2.42 | 20 % | -47 % | 0.43 |
| Momentum 120d, topp 1, utan filter | 2.25 | 72 % | -53 % | 1.36 |
| *Buy & hold BTC (2:a halvan)* | | 33 % | -53 % | 0.62 |
| *Lika delar (2:a halvan)* | | 27 % | -63 % | 0.42 |

## Slutsats (automatisk)

- Av 82 strategier slog 71 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
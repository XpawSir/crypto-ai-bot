# Portföljtest: rotation mellan flera valutor

Skapad 2026-10-18 08:02 UTC. Period 2019-09-08 – 2026-10-17 (delningsdatum för håll-ut-test: 2023-03-29). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 686 % | 34 % | -77 % | 0.79 | 0.44 |
| Buy & hold lika delar (månadsvis ombalans) | 4012 % | 69 % | -76 % | 1.07 | 0.90 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 16636 % | 105 % | -65 % | 1.18 | 1.61 |
| Momentum 120d, topp 1, utan filter | 29685 % | 123 % | -85 % | 1.25 | 1.44 |
| Momentum 120d, topp 3, trendfilter 100 | 12563 % | 97 % | -69 % | 1.16 | 1.41 |
| Trendkorg (varje valuta över SMA 50) | 5027 % | 74 % | -53 % | 1.39 | 1.39 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 6925 % | 82 % | -61 % | 1.32 | 1.35 |
| Momentum 60d, topp 3, trendfilter 200 | 7003 % | 82 % | -63 % | 1.07 | 1.30 |
| Momentum 90d, topp 3, trendfilter 100 | 11607 % | 95 % | -75 % | 1.14 | 1.28 |
| Momentum 120d, topp 3, trendfilter 200 | 9009 % | 89 % | -71 % | 1.09 | 1.25 |
| Lika delar när BTC > SMA 100 | 5058 % | 74 % | -60 % | 1.26 | 1.23 |
| Momentum 120d, topp 3, utan filter, volatilitetsstyrd | 3572 % | 66 % | -58 % | 1.24 | 1.13 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3940 % | 68 % | -61 % | 1.21 | 1.12 |
| Momentum 120d, topp 2, utan filter | 7174 % | 83 % | -76 % | 1.12 | 1.09 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 51 % | -68 % | 64/72 / 61/72 / 69/72 | 23/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 49 % | -53 % | 6/6 / 6/6 / 2/6 | 3/6 / 2/6 / 6/6 |
| Marknadsfilter | 4 | 50 % | -58 % | 4/4 / 4/4 / 0/4 | 1/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.01 | 41 % | -56 % | 0.74 |
| Trendkorg (varje valuta över SMA 50) | 2.71 | 24 % | -43 % | 0.55 |
| Momentum 120d, topp 3, trendfilter 100 | 2.51 | 47 % | -40 % | 1.18 |
| Lika delar när BTC > SMA 100 | 2.38 | 23 % | -47 % | 0.49 |
| Momentum 120d, topp 1, utan filter | 2.24 | 74 % | -53 % | 1.39 |
| *Buy & hold BTC (2:a halvan)* | | 35 % | -53 % | 0.65 |
| *Lika delar (2:a halvan)* | | 30 % | -63 % | 0.47 |

## Slutsats (automatisk)

- Av 82 strategier slog 71 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
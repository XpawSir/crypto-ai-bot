# Portföljtest: rotation mellan flera valutor

Skapad 2026-11-22 11:19 UTC. Period 2019-09-08 – 2026-11-21 (delningsdatum för håll-ut-test: 2023-04-16). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 481 % | 28 % | -77 % | 0.71 | 0.36 |
| Buy & hold lika delar (månadsvis ombalans) | 2890 % | 60 % | -76 % | 1.01 | 0.79 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 11471 % | 93 % | -67 % | 1.12 | 1.39 |
| Trendkorg (varje valuta över SMA 50) | 4950 % | 72 % | -53 % | 1.38 | 1.36 |
| Momentum 120d, topp 3, trendfilter 100 | 10818 % | 92 % | -69 % | 1.12 | 1.32 |
| Momentum 120d, topp 1, utan filter | 21301 % | 110 % | -85 % | 1.20 | 1.30 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 5398 % | 74 % | -61 % | 1.24 | 1.22 |
| Momentum 60d, topp 3, trendfilter 200 | 6050 % | 77 % | -63 % | 1.04 | 1.22 |
| Momentum 90d, topp 3, trendfilter 100 | 9789 % | 89 % | -75 % | 1.10 | 1.19 |
| Lika delar när BTC > SMA 100 | 4430 % | 70 % | -60 % | 1.21 | 1.16 |
| Momentum 120d, topp 3, trendfilter 200 | 6726 % | 80 % | -71 % | 1.04 | 1.12 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3537 % | 65 % | -61 % | 1.17 | 1.06 |
| Momentum 120d, topp 1, trendfilter 100 | 8836 % | 86 % | -85 % | 1.08 | 1.01 |
| Trendkorg (varje valuta över SMA 100) | 2322 % | 56 % | -55 % | 1.14 | 1.01 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 47 % | -68 % | 65/72 / 61/72 / 70/72 | 29/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 46 % | -53 % | 6/6 / 6/6 / 4/6 | 3/6 / 2/6 / 6/6 |
| Marknadsfilter | 4 | 45 % | -58 % | 4/4 / 4/4 / 1/4 | 2/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.13 | 22 % | -67 % | 0.33 |
| Trendkorg (varje valuta över SMA 50) | 2.75 | 20 % | -43 % | 0.47 |
| Momentum 120d, topp 3, trendfilter 100 | 2.56 | 37 % | -40 % | 0.94 |
| Lika delar när BTC > SMA 100 | 2.46 | 15 % | -47 % | 0.32 |
| Momentum 120d, topp 1, utan filter | 2.29 | 55 % | -53 % | 1.04 |
| *Buy & hold BTC (2:a halvan)* | | 21 % | -53 % | 0.40 |
| *Lika delar (2:a halvan)* | | 15 % | -64 % | 0.23 |

## Slutsats (automatisk)

- Av 82 strategier slog 75 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
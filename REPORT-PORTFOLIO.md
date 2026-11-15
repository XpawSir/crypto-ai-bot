# Portföljtest: rotation mellan flera valutor

Skapad 2026-11-15 10:51 UTC. Period 2019-09-08 – 2026-11-14 (delningsdatum för håll-ut-test: 2023-04-12). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 519 % | 29 % | -77 % | 0.73 | 0.38 |
| Buy & hold lika delar (månadsvis ombalans) | 2998 % | 61 % | -76 % | 1.01 | 0.80 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 12016 % | 95 % | -65 % | 1.13 | 1.45 |
| Trendkorg (varje valuta över SMA 50) | 4950 % | 73 % | -53 % | 1.38 | 1.36 |
| Momentum 120d, topp 3, trendfilter 100 | 10818 % | 92 % | -69 % | 1.13 | 1.33 |
| Momentum 120d, topp 1, utan filter | 21979 % | 112 % | -85 % | 1.20 | 1.31 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 5511 % | 75 % | -61 % | 1.25 | 1.24 |
| Momentum 60d, topp 3, trendfilter 200 | 6050 % | 77 % | -63 % | 1.04 | 1.22 |
| Momentum 90d, topp 3, trendfilter 100 | 9789 % | 89 % | -75 % | 1.10 | 1.20 |
| Lika delar när BTC > SMA 100 | 4430 % | 70 % | -60 % | 1.22 | 1.16 |
| Momentum 120d, topp 3, trendfilter 200 | 6495 % | 79 % | -71 % | 1.04 | 1.11 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3537 % | 65 % | -61 % | 1.17 | 1.06 |
| Momentum 120d, topp 1, trendfilter 100 | 8836 % | 87 % | -85 % | 1.09 | 1.02 |
| Trendkorg (varje valuta över SMA 100) | 2322 % | 56 % | -55 % | 1.14 | 1.01 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 47 % | -68 % | 64/72 / 61/72 / 69/72 | 28/72 / 9/72 / 72/72 |
| Trendkorg | 6 | 46 % | -53 % | 6/6 / 6/6 / 4/6 | 3/6 / 2/6 / 6/6 |
| Marknadsfilter | 4 | 45 % | -58 % | 4/4 / 4/4 / 1/4 | 1/4 / 1/4 / 2/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.08 | 26 % | -65 % | 0.39 |
| Trendkorg (varje valuta över SMA 50) | 2.71 | 22 % | -43 % | 0.52 |
| Momentum 120d, topp 3, trendfilter 100 | 2.53 | 39 % | -40 % | 0.99 |
| Lika delar när BTC > SMA 100 | 2.42 | 18 % | -47 % | 0.37 |
| Momentum 120d, topp 1, utan filter | 2.30 | 57 % | -53 % | 1.07 |
| *Buy & hold BTC (2:a halvan)* | | 24 % | -53 % | 0.45 |
| *Lika delar (2:a halvan)* | | 19 % | -63 % | 0.29 |

## Slutsats (automatisk)

- Av 82 strategier slog 74 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
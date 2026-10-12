# Portföljtest: rotation mellan flera valutor

Skapad 2026-10-12 20:32 UTC. Period 2019-09-08 – 2026-10-11 (delningsdatum för håll-ut-test: 2023-03-26). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 708 % | 34 % | -77 % | 0.80 | 0.45 |
| Buy & hold lika delar (månadsvis ombalans) | 4310 % | 70 % | -76 % | 1.09 | 0.93 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 17997 % | 108 % | -65 % | 1.20 | 1.65 |
| Momentum 120d, topp 1, utan filter | 33070 % | 127 % | -85 % | 1.26 | 1.49 |
| Momentum 120d, topp 3, trendfilter 100 | 13593 % | 100 % | -69 % | 1.17 | 1.44 |
| Trendkorg (varje valuta över SMA 50) | 5222 % | 75 % | -53 % | 1.40 | 1.41 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 7439 % | 84 % | -61 % | 1.34 | 1.38 |
| Momentum 60d, topp 3, trendfilter 200 | 7684 % | 85 % | -63 % | 1.08 | 1.34 |
| Momentum 90d, topp 3, trendfilter 100 | 13013 % | 99 % | -75 % | 1.16 | 1.32 |
| Momentum 120d, topp 3, trendfilter 200 | 9750 % | 91 % | -71 % | 1.11 | 1.28 |
| Lika delar när BTC > SMA 100 | 5433 % | 76 % | -60 % | 1.28 | 1.26 |
| Momentum 120d, topp 3, utan filter, volatilitetsstyrd | 3842 % | 68 % | -58 % | 1.26 | 1.16 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 4236 % | 70 % | -61 % | 1.23 | 1.15 |
| Momentum 120d, topp 2, utan filter | 7862 % | 85 % | -76 % | 1.14 | 1.13 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 53 % | -68 % | 64/72 / 61/72 / 71/72 | 24/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 50 % | -53 % | 6/6 / 6/6 / 2/6 | 3/6 / 2/6 / 6/6 |
| Marknadsfilter | 4 | 51 % | -58 % | 4/4 / 4/4 / 1/4 | 1/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.02 | 45 % | -56 % | 0.80 |
| Trendkorg (varje valuta över SMA 50) | 2.70 | 25 % | -43 % | 0.60 |
| Momentum 120d, topp 3, trendfilter 100 | 2.51 | 51 % | -40 % | 1.27 |
| Lika delar när BTC > SMA 100 | 2.37 | 27 % | -47 % | 0.57 |
| Momentum 120d, topp 1, utan filter | 2.25 | 80 % | -53 % | 1.51 |
| *Buy & hold BTC (2:a halvan)* | | 36 % | -53 % | 0.68 |
| *Lika delar (2:a halvan)* | | 33 % | -63 % | 0.53 |

## Slutsats (automatisk)

- Av 82 strategier slog 74 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
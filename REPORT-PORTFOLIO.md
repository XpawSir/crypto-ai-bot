# Portföljtest: rotation mellan flera valutor

Skapad 2026-11-08 10:20 UTC. Period 2019-09-08 – 2026-11-07 (delningsdatum för håll-ut-test: 2023-04-09). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 632 % | 32 % | -77 % | 0.77 | 0.42 |
| Buy & hold lika delar (månadsvis ombalans) | 3633 % | 66 % | -76 % | 1.05 | 0.86 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 14909 % | 101 % | -65 % | 1.16 | 1.55 |
| Momentum 120d, topp 1, utan filter | 26830 % | 118 % | -85 % | 1.23 | 1.39 |
| Trendkorg (varje valuta över SMA 50) | 4950 % | 73 % | -53 % | 1.38 | 1.37 |
| Momentum 120d, topp 3, trendfilter 100 | 11181 % | 93 % | -69 % | 1.13 | 1.35 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 6430 % | 79 % | -61 % | 1.29 | 1.30 |
| Momentum 60d, topp 3, trendfilter 200 | 6260 % | 78 % | -63 % | 1.04 | 1.24 |
| Momentum 90d, topp 3, trendfilter 100 | 10118 % | 91 % | -75 % | 1.11 | 1.22 |
| Momentum 120d, topp 3, trendfilter 200 | 8070 % | 85 % | -71 % | 1.07 | 1.20 |
| Lika delar när BTC > SMA 100 | 4583 % | 71 % | -60 % | 1.23 | 1.18 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3655 % | 66 % | -61 % | 1.18 | 1.08 |
| Momentum 120d, topp 3, utan filter, volatilitetsstyrd | 3200 % | 63 % | -58 % | 1.20 | 1.08 |
| Momentum 120d, topp 2, utan filter | 6606 % | 80 % | -76 % | 1.10 | 1.05 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 49 % | -68 % | 64/72 / 61/72 / 69/72 | 22/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 47 % | -53 % | 6/6 / 6/6 / 3/6 | 3/6 / 2/6 / 5/6 |
| Marknadsfilter | 4 | 47 % | -58 % | 4/4 / 4/4 / 0/4 | 1/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 2.99 | 37 % | -57 % | 0.64 |
| Trendkorg (varje valuta över SMA 50) | 2.68 | 23 % | -43 % | 0.53 |
| Momentum 120d, topp 3, trendfilter 100 | 2.49 | 42 % | -40 % | 1.05 |
| Lika delar när BTC > SMA 100 | 2.38 | 20 % | -47 % | 0.42 |
| Momentum 120d, topp 1, utan filter | 2.23 | 68 % | -53 % | 1.28 |
| *Buy & hold BTC (2:a halvan)* | | 32 % | -53 % | 0.60 |
| *Lika delar (2:a halvan)* | | 26 % | -63 % | 0.41 |

## Slutsats (automatisk)

- Av 82 strategier slog 72 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
# Portföljtest: rotation mellan flera valutor

Skapad 2026-10-25 08:25 UTC. Period 2019-09-08 – 2026-10-24 (delningsdatum för håll-ut-test: 2023-04-02). Valutor: BTC, ETH, BNB, XRP, ADA, LTC, TRX, LINK, SOL, DOGE. Kostnad 0,15 % per handlad krona. Signaler fördröjda en dag.
**Överlevnadsfel:** valutorna är sådana som är stora idag. Det flatterar buy & hold och alla strategier som äger vinnare. Riktiga resultat framåt blir sannolikt sämre.

Mått: CAGR = årlig tillväxt, Max ned = största nedgång, Calmar = CAGR / största nedgång (högre är bättre risk för pengarna), Sharpe = avkastning per svängning.

## Riktmärken

| | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Buy & hold BTC | 680 % | 33 % | -77 % | 0.79 | 0.44 |
| Buy & hold lika delar (månadsvis ombalans) | 3953 % | 68 % | -76 % | 1.07 | 0.89 |

## Topp 12 av 82 strategier (efter Calmar, hela perioden)

| Strategi | Total | CAGR | Max ned | Sharpe | Calmar |
|---|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 16306 % | 104 % | -65 % | 1.18 | 1.60 |
| Momentum 120d, topp 1, utan filter | 28788 % | 121 % | -85 % | 1.24 | 1.43 |
| Momentum 120d, topp 3, trendfilter 100 | 12314 % | 97 % | -69 % | 1.15 | 1.40 |
| Trendkorg (varje valuta över SMA 50) | 4985 % | 73 % | -53 % | 1.38 | 1.38 |
| Momentum 120d, topp 1, utan filter, volatilitetsstyrd | 6785 % | 81 % | -61 % | 1.31 | 1.33 |
| Momentum 60d, topp 3, trendfilter 200 | 6896 % | 81 % | -63 % | 1.06 | 1.28 |
| Momentum 90d, topp 3, trendfilter 100 | 11228 % | 94 % | -75 % | 1.13 | 1.26 |
| Momentum 120d, topp 3, trendfilter 200 | 8830 % | 88 % | -71 % | 1.09 | 1.24 |
| Lika delar när BTC > SMA 100 | 4981 % | 73 % | -60 % | 1.25 | 1.22 |
| Momentum 120d, topp 3, utan filter, volatilitetsstyrd | 3504 % | 65 % | -58 % | 1.24 | 1.12 |
| Momentum 120d, topp 1, trendfilter 100, volatilitetsstyrd | 3860 % | 67 % | -61 % | 1.20 | 1.11 |
| Momentum 120d, topp 2, utan filter | 7026 % | 82 % | -76 % | 1.12 | 1.08 |

## Robusthet: hur ser HELA rutnätet ut (inte bara de bästa)?

| Familj | Antal | Median-CAGR | Median Max ned | Slår buy & hold BTC på Calmar (hela / 1:a halvan / 2:a halvan) | Slår lika delar på Calmar (hela / 1:a / 2:a) |
|---|---|---|---|---|---|
| Momentum | 72 | 50 % | -68 % | 64/72 / 61/72 / 69/72 | 23/72 / 8/72 / 72/72 |
| Trendkorg | 6 | 48 % | -53 % | 6/6 / 6/6 / 2/6 | 3/6 / 2/6 / 6/6 |
| Marknadsfilter | 4 | 49 % | -58 % | 4/4 / 4/4 / 0/4 | 1/4 / 1/4 / 3/4 |

## Håll-ut-test

Bästa strategin på första halvan (efter Calmar) och de 5 bästa, mätta på andra halvan som de inte sett.

| Strategi (vald på 1:a halvan) | Calmar 1:a | CAGR 2:a | Max ned 2:a | Calmar 2:a |
|---|---|---|---|---|
| Momentum 120d, topp 3, utan filter | 3.04 | 41 % | -56 % | 0.73 |
| Trendkorg (varje valuta över SMA 50) | 2.71 | 23 % | -43 % | 0.55 |
| Momentum 120d, topp 3, trendfilter 100 | 2.53 | 46 % | -40 % | 1.17 |
| Lika delar när BTC > SMA 100 | 2.42 | 23 % | -47 % | 0.48 |
| Momentum 120d, topp 1, utan filter | 2.27 | 72 % | -53 % | 1.36 |
| *Buy & hold BTC (2:a halvan)* | | 34 % | -53 % | 0.65 |
| *Lika delar (2:a halvan)* | | 29 % | -63 % | 0.46 |

## Slutsats (automatisk)

- Av 82 strategier slog 71 buy & hold BTC på avkastning per risk (Calmar) på andra halvan.
- De 5 som var bäst på första halvan slog BTC på Calmar i 3 av 5 och på tillväxt (CAGR) i 3 av 5 på andra halvan.
- Mediannedgången var -67 % mot -77 % för buy & hold BTC: strategierna minskade riskerna, som väntat.

Läs med försiktighet: många testade varianter ger risk för tur, få valutor och ett begränsat antal marknadscykler. Historik garanterar ingenting.
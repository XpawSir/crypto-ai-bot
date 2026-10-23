# Test: kombinationsbot (krypto-trend + ETF-trend + aktiemomentum)

Yahoo Finance dagliga stängningar 2018-09-18 till 2026-10-23 (8.1 år), mitt 2022-10-06. Avgift 0,12 %/sida på all omsättning, ränta 3,5 % på kontanter, signal på gårdagens data. Aktieuniversum valt 2010 (överlevnadsbias, resultatet för ben 3 är för snällt).

| Strategi | Tillväxt/år | Värsta ras | Kalmar | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |
|---|---|---|---|---|---|
| Ben 1: Krypto-trend | 60.5 % | −54.1 % | 1.12 | 76.4 %, −49.9 %, 1.53 | 46.0 %, −31.2 %, 1.48 |
| Ben 2: Trendkorg ETF | 6.7 % | −10.8 % | 0.62 | 6.0 %, −8.7 %, 0.68 | 7.4 %, −5.8 %, 1.27 |
| Ben 3: Aktiemomentum | 7.7 % | −35.6 % | 0.22 | 10.0 %, −35.6 %, 0.28 | 5.4 %, −25.0 %, 0.22 |
| Lika delar (1/3 var) | 26.3 % | −25.8 % | 1.02 | 32.9 %, −23.2 %, 1.42 | 20.1 %, −13.1 %, 1.53 |
| Risk-paritet (omvänd volatilitet) | 14.1 % | −13.8 % | 1.02 | 13.1 %, −13.6 %, 0.97 | 15.1 %, −7.3 %, 2.08 |
| Referens: köp och behåll S&P 500 (SPY) | 12.7 % | −34.1 % | 0.37 | 6.8 %, −34.1 %, 0.20 | 19.0 %, −19.0 %, 1.00 |
| Referens: 60 % SPY + 40 % TLT (utan ombalans) | 6.4 % | −28.2 % | 0.23 | 3.8 %, −27.0 %, 0.14 | 9.0 %, −13.5 %, 0.67 |

## Kriterier (mot medianen av de tre benen)

Median Kalmar: 1:a halvan 0.68, 2:a halvan 1.27. Median värsta ras −35.6 %. Median tillväxt 7.7 %/år.

| Kombination | Kalmar högre i båda halvor | Lägre värsta ras än medianen | Tillväxt inom 5 pe från medianen | Godkänd |
|---|---|---|---|---|
| Lika delar (1/3 var) | ja | ja | ja | **JA** |
| Risk-paritet (omvänd volatilitet) | ja | ja | ja | **JA** |

Historik garanterar inget. Ben 3 är uppblåst av överlevnadsbias.

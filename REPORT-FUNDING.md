# Funding-arbitrage: test

Skapad 2026-10-13T18:02 UTC. Hälften spot, hälften säkerhet för 1x kort perpetual. Kostnad in/ut 0.15 % per gång, ombalansering 0,01 %/dag.

| Variant | Period | Total | Per år | Största nedgång | Sharpe | Sämsta dag | Minusdagar | Per år 1:a halvan | Per år 2:a halvan | Senaste 365 d |
|---|---|---|---|---|---|---|---|---|---|---|
| BTC, alltid inne | 2020-01-02 – | 30.7 % | 4.1 % | -1.4 % | 5.89 | -0.5 % | 35.8 % | 6.4 % | 1.8 % | -0.1 % |
| ETH, alltid inne | 2020-01-02 – | 39.8 % | 5.1 % | -1.8 % | 5.53 | -0.8 % | 36.0 % | 8.5 % | 1.8 % | -0.6 % |
| SOL, alltid inne | 2020-09-15 – | -19.6 % | -3.5 % | -29.5 % | -0.36 | -21.2 % | 48.5 % | -7.6 % | 0.8 % | -2.7 % |
| XRP, alltid inne | 2020-01-07 – | 41.8 % | 5.3 % | -4.0 % | 2.19 | -3.5 % | 42.4 % | 9.1 % | 1.6 % | -1.8 % |
| BNB, alltid inne | 2020-02-11 – | -12.3 % | -2.0 % | -21.5 % | -1.46 | -0.7 % | 56.5 % | -1.3 % | -2.6 % | -0.9 % |
| BTC, bara när funding 7 d > 5 %/år | 2020-01-02 – | 10.9 % | 1.5 % | -7.5 % | 1.67 | -0.5 % | 20.3 % | 4.1 % | -1.0 % | -2.6 % |
| ETH, bara när funding 7 d > 5 %/år | 2020-01-02 – | 20.7 % | 2.8 % | -6.8 % | 2.58 | -0.8 % | 20.5 % | 6.7 % | -0.9 % | -4.0 % |
| SOL, bara när funding 7 d > 5 %/år | 2020-09-15 – | 8.1 % | 1.3 % | -6.1 % | 1.11 | -0.4 % | 20.2 % | 3.2 % | -0.6 % | -3.8 % |
| XRP, bara när funding 7 d > 5 %/år | 2020-01-07 – | 30.9 % | 4.1 % | -5.2 % | 2.00 | -2.5 % | 23.3 % | 8.8 % | -0.5 % | -2.3 % |
| BNB, bara när funding 7 d > 5 %/år | 2020-02-11 – | 8.1 % | 1.2 % | -6.8 % | 1.14 | -0.4 % | 10.4 % | 3.9 % | -1.5 % | -2.9 % |
| BTC + ETH, alltid inne | 2020-01-02 – | 35.2 % | 4.6 % | -1.0 % | 6.04 | -0.7 % | 34.6 % | 7.4 % | 1.8 % | -0.4 % |
| BTC + ETH, funding 7 d > 5 %/år | 2020-01-02 – | 15.7 % | 2.2 % | -7.1 % | 2.48 | -0.7 % | 24.8 % | 5.4 % | -1.0 % | -3.3 % |
| BTC + ETH, funding 14 d > 0 | 2020-01-02 – | 31.7 % | 4.2 % | -1.5 % | 5.31 | -0.7 % | 32.0 % | 7.0 % | 1.4 % | -1.0 % |
| Alla 5, funding 7 d > 5 %/år | 2020-01-02 – | NaN % | NaN % | NaN % | 0.00 | NaN % | 10.2 % | NaN % | NaN % | NaN % |
| Alla 5, funding 7 d > 10 %/år | 2020-01-02 – | NaN % | NaN % | NaN % | 0.00 | NaN % | 8.7 % | NaN % | NaN % | NaN % |

## Snittfunding per år (årstakt, det en kort position fick)

| År | BTC | ETH | SOL | XRP | BNB |
|---|---|---|---|---|---|
| 2019 | - | - | - | - | - |
| 2020 | 17.2 % | 27.4 % | -12.4 % | 24.6 % | 2.5 % |
| 2021 | 30.6 % | 37.5 % | 28.6 % | 48.1 % | 21.7 % |
| 2022 | 4.2 % | 0.8 % | -38.0 % | 0.0 % | -12.6 % |
| 2023 | 7.9 % | 8.3 % | 1.3 % | 8.2 % | -8.3 % |
| 2024 | 11.9 % | 13.0 % | 13.6 % | 14.2 % | -3.3 % |
| 2025 | 5.1 % | 4.9 % | 0.4 % | 3.5 % | -2.1 % |
| 2026 | 2.9 % | 1.9 % | -1.1 % | -0.3 % | 2.9 % |

## Nåbara datakällor från GitHub Actions

- Binance terminer (fapi): HTTP 451 {   "code": 0,   "msg": "Service unavailable from a restricted location according to 'b. Eligibility' in https://www.bin
- Binance spot (data-api): HTTP 200 {"symbol":"BTCUSDT","bidPrice":"83060.00000000","bidQty":"13.29994000","askPrice":"83060.01000000","askQty":"0.00140000"
- OKX funding: HTTP 200 {"code":"0","data":[{"formulaType":"withRate","fundingRate":"0.0000464027326760","fundingTime":"1791936000000","impactVa
- Bybit tickers: HTTP 403 {     error:The Amazon CloudFront distribution is configured to block access from your country }
- Kraken Futures: HTTP 200 {"result":"success","serverTime":"2026-10-13T17:57:09.374Z","tickers":[{"symbol":"PF_PENGUUSD","last":0.007724,"lastTime
- Deribit: HTTP 200 {"jsonrpc":"2.0","result":2.080200185269701e-4,"usIn":1791914229582411,"usOut":1791914229585694,"usDiff":3283,"testnet":
- Hyperliquid: HTTP 200 [{"universe":[{"szDecimals":5,"name":"BTC","maxLeverage":40,"marginTableId":56},{"szDecimals":4,"name":"ETH","maxLeverag

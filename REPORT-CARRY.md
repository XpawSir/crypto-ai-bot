# Test: funding carry (kassa och carry) för BTC och ETH

## BTC

Datakällor som provades: binance: misslyckades (HTTP 451 https://fapi.binance.com/fapi/v1/fundingRate?symbol=BTCUSDT&); bybit: misslyckades (HTTP 403 https://api.bybit.com/v5/market/funding/history?category=lin); okx: 277 punkter, 0.3 år; hyperliquid: 29617 punkter, 3.4 år.

Vald källa: **hyperliquid**, 1258 dagar (3.4 år). Genomsnittlig funding: 13.9 % per år på nominellt belopp. Andel dagar med negativ funding: 12.2 %.

| Regel | Nettoavkastning/år (hela) | Värsta nedgång | Affärer | 1:a halvan/år | 2:a halvan/år |
|---|---|---|---|---|---|
| Alltid hedgad | 9.3 % | −0.37 % | 1 | 13.1 % | 5.8 % |
| Hedgad när funding de senaste 7 dagarna är positiv | 8.8 % | −0.32 % | 29 | 12.9 % | 5.1 % |
| Hedgad när funding de senaste 7 dagarna är över 10 % per år | 7.5 % | −0.23 % | 56 | 11.8 % | 3.6 % |
| Hedgad när funding de senaste 30 dagarna är över 5 % per år | 9.1 % | −0.28 % | 13 | 13.1 % | 5.4 % |

Jämförelse: bara kontanter med ränta ger 3.5 % per år.

## ETH

Datakällor som provades: binance: misslyckades (HTTP 451 https://fapi.binance.com/fapi/v1/fundingRate?symbol=ETHUSDT&); bybit: misslyckades (HTTP 403 https://api.bybit.com/v5/market/funding/history?category=lin); okx: 277 punkter, 0.3 år; hyperliquid: 29617 punkter, 3.4 år.

Vald källa: **hyperliquid**, 1258 dagar (3.4 år). Genomsnittlig funding: 14.0 % per år på nominellt belopp. Andel dagar med negativ funding: 12.4 %.

| Regel | Nettoavkastning/år (hela) | Värsta nedgång | Affärer | 1:a halvan/år | 2:a halvan/år |
|---|---|---|---|---|---|
| Alltid hedgad | 9.3 % | −0.43 % | 1 | 13.5 % | 5.5 % |
| Hedgad när funding de senaste 7 dagarna är positiv | 8.6 % | −0.44 % | 35 | 13.1 % | 4.6 % |
| Hedgad när funding de senaste 7 dagarna är över 10 % per år | 7.1 % | −0.16 % | 62 | 11.2 % | 3.4 % |
| Hedgad när funding de senaste 30 dagarna är över 5 % per år | 9.0 % | −0.25 % | 15 | 13.1 % | 5.1 % |

Jämförelse: bara kontanter med ränta ger 3.5 % per år.

## Godkännandekriterier (satta före testet)

| Valuta | Källa | Minst 2 års data | Slår kontantränta +2 pe i båda halvor, nedgång < 3 % | Bästa regel |
|---|---|---|---|---|
| BTC | hyperliquid | ja | ja | Alltid hedgad (9.3 %/år) |
| ETH | hyperliquid | ja | nej | – |

## Slutsats

**Carry klarar inte alla kriterier.** Då läggs ingen carry-bot på sajten som lösning för att tjäna pengar. Se tabellerna ovan för skälen.

Förenklingar: baseringsvinst/förlust, marginalsamtal och likvidation modelleras inte; motpartsrisk hos börsen (FTX 2022) ingår inte; avgifterna är för en vanlig kund utan rabatt; kontantränta 3,5 % antas på kapital som inte är bundet. Historik garanterar inget.

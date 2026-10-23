# Test: hänger resultatet på startdatumet?

Rullande fönster, ny start var 7:e dag. Trend = över medelvärde, allt eller inget, ränta 3,5 % på kontanter, avgift 0,12 %/sida, signal på gårdagens data.

| Tillgång | Fönster | Antal | Trend slår köp och behåll (slutvärde) | Trend har lägre värsta nedgång | Median avkastning trend / köp och behåll | Median värsta nedgång trend / köp och behåll | Sämsta fönstret (skillnad, start) | Robust enligt kriterierna |
|---|---|---|---|---|---|---|---|---|
| BTC-USD (50-d) | 1 år | 572 | 57.7 % | 81.8 % | 72.4 % / 73.5 % | -28.6 % / -49.0 % | -982 pe, 2016-12-13 | **JA** |
| BTC-USD (50-d) | 2 år | 520 | 60.4 % | 78.5 % | 234.0 % / 219.1 % | -36.1 % / -61.8 % | -1742 pe, 2015-12-22 | nej |
| ETH-USD (50-d) | 1 år | 408 | 57.4 % | 87.3 % | 43.3 % / 19.3 % | -40.5 % / -61.1 % | -629 pe, 2020-03-22 | **JA** |
| ETH-USD (50-d) | 2 år | 356 | 70.5 % | 89.9 % | 79.2 % / 52.5 % | -44.5 % / -67.2 % | -1496 pe, 2020-03-29 | **JA** |
| SPY (100-d) | 1 år | 564 | 11.2 % | 76.2 % | 6.8 % / 14.1 % | -8.6 % / -12.3 % | -50 pe, 2020-03-20 | nej |
| SPY (100-d) | 2 år | 512 | 2.9 % | 88.9 % | 12.8 % / 27.5 % | -12.9 % / -20.2 % | -61 pe, 2020-03-20 | nej |

Kriterier (satta före): lägre värsta nedgång i minst 80 % av fönstren OCH slår köp och behåll i slutvärde i minst 50 % av fönstren.

Fönstren överlappar varandra kraftigt, så de är inte oberoende prov. Perioden innehåller bara några få marknadscykler. Historik garanterar inget.

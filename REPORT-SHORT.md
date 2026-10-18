# Test: kortare "allt eller inget"-regler för BTC och ETH

Dagliga stängningar från Yahoo Finance, 2018-09-18 till 2026-10-18 (8.1 år). Mitten: 2022-10-03. Avgift 0,1 % + 0,02 % glidning per sida, signalen på gårdagens data och handel på dagens stängning. Varje valuta har en egen lika stor del, ingen ombalansering mellan dem. Kalmar = årlig tillväxt delat med värsta ras (högre är bättre).

| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | Första halvan (tillv/år, ras) | Andra halvan (tillv/år, ras) |
|---|---|---|---|---|---|---|
| Köp och behåll BTC + ETH (hälften var) | 36.2 % | −77.0 % | 0.47 | 0.2 | 45.4 %, −77.0 % | 31.2 %, −57.9 % |
| Köp och behåll BTC | 37.2 % | −76.6 % | 0.48 | 0.1 | 31.1 %, −72.6 % | 42.4 %, −53.1 % |
| GAMMAL Trend BTC+ETH (20–200 d, steg 25 %) | 47.1 % | −52.6 % | 0.90 | 124.8 | 81.5 %, −41.9 % | 22.6 %, −32.4 % |
| NY Trend BTC+ETH (10–100 d, allt eller inget) | 46.9 % | −58.6 % | 0.80 | 69.5 | 84.8 %, −49.8 % | 18.3 %, −39.2 % |
| Variant: långa medelvärden 20–200 d, allt eller inget | 44.3 % | −51.3 % | 0.86 | 30.7 | 72.1 %, −51.3 % | 21.7 %, −33.4 % |
| Variant: mycket korta 5–50 d, allt eller inget | 38.3 % | −56.3 % | 0.68 | 89.2 | 79.0 %, −49.4 % | 14.0 %, −37.1 % |
| GAMMAL Trend-ensemble BTC (20–200 d, steg 50 %) | 49.6 % | −49.1 % | 1.01 | 30.9 | 68.0 %, −41.7 % | 33.2 %, −28.5 % |
| NY Trend-ensemble BTC (10–100 d, allt eller inget) | 44.2 % | −59.3 % | 0.75 | 35.4 | 69.3 %, −45.2 % | 22.9 %, −32.1 % |
| GAMMAL Volatilitetsstyrd BTC (SMA 100, vol-storlek) | 43.0 % | −47.2 % | 0.91 | 16.7 | 58.6 %, −39.1 % | 28.9 %, −35.7 % |
| NY Volatilitetsstyrd BTC (SMA 50, allt eller inget) | 53.5 % | −58.3 % | 0.92 | 19.2 | 75.9 %, −49.6 % | 33.9 %, −31.6 % |
| Enkel regel BTC+ETH: över 10-dagars medel, allt eller inget | 25.0 % | −58.3 % | 0.43 | 129.3 | 45.1 %, −53.1 % | 14.6 %, −45.5 % |
| Enkel regel BTC+ETH: över 20-dagars medel, allt eller inget | 36.9 % | −59.3 % | 0.62 | 78.4 | 79.5 %, −51.1 % | 14.7 %, −39.2 % |
| Enkel regel BTC+ETH: över 30-dagars medel, allt eller inget | 50.0 % | −57.7 % | 0.87 | 59.8 | 91.2 %, −47.0 % | 18.3 %, −38.4 % |
| Enkel regel BTC+ETH: över 50-dagars medel, allt eller inget | 55.5 % | −57.5 % | 0.97 | 38.7 | 95.0 %, −45.5 % | 26.7 %, −36.8 % |
| Enkel regel BTC+ETH: över 100-dagars medel, allt eller inget | 44.0 % | −57.8 % | 0.76 | 26.5 | 72.4 %, −45.2 % | 19.1 %, −39.8 % |
| Enkel regel BTC+ETH: över 150-dagars medel, allt eller inget | 47.8 % | −53.9 % | 0.89 | 16.1 | 81.3 %, −53.9 % | 23.8 %, −28.6 % |
| Enkel regel BTC+ETH: över 200-dagars medel, allt eller inget | 37.2 % | −61.3 % | 0.61 | 13.1 | 55.1 %, −61.3 % | 22.4 %, −33.1 % |

## Gammal mot ny
- **Trend BTC+ETH:** tillväxt/år 47.1 % → 46.9 %, värsta ras −52.6 % → −58.6 %, Kalmar 0.90 → 0.80, affärer/år 124.8 → 69.5. Andra halvan: 22.6 % → 18.3 %.
- **Trend-ensemble:** tillväxt/år 49.6 % → 44.2 %, värsta ras −49.1 % → −59.3 %, Kalmar 1.01 → 0.75, affärer/år 30.9 → 35.4. Andra halvan: 33.2 % → 22.9 %.
- **Volatilitetsstyrd:** tillväxt/år 43.0 % → 53.5 %, värsta ras −47.2 % → −58.3 %, Kalmar 0.91 → 0.92, affärer/år 16.7 → 19.2. Andra halvan: 28.9 % → 33.9 %.

Läs med försiktighet: det är en enda historia med få oberoende trendperioder, och reglerna är valda efter att vi sett kryptots historia. Tabellen visar också alla enkla regler (rad "Enkel regel"), så att man ser om resultatet hänger på ett enskilt tal. Historik garanterar inget.

# Test: prediktionsmarknader (Polymarket)

Pris 7 dagar före slut för avgjorda marknader, mot vad som faktiskt hände. Endast läsning av öppen data, ingen handel. Priset på det andra utfallet antas vara 1 minus första (ingen spread), vilket är snällt mot strategin.

| Prisgrupp (vid T−7d) | Antal | Snittpris | Andel som vann | Skillnad (pe) |
|---|---|---|---|---|

## Strategi: köp utfall som kostar 0,90–0,98 sju dagar före slut, håll till avgörande (kostnad 1 % per affär)

| Period | Affärer | Vinstandel | Snittavkastning per affär | Värsta affär |
|---|---|---|---|---|
| Hela urvalet | 0 | – | – | – |
| Första halvan (tid) | 0 | – | – | – |
| Andra halvan (tid) | 0 | – | – | – |

Kriterier (satta före): minst 100 affärer, positiv avkastning efter 1 % kostnad i hela urvalet och i båda halvorna.

**Strategin klarar inte kriterierna** (eller för få affärer). Då är den bara ett pappersexperiment utan belägg.

## Anmärkningar
- Marknadslista: HTTP 422 https://gamma-api.polymarket.com/markets?closed=true&limit=100&offset=2100&order=endDate&a
- Avgjorda marknader hittade: 0
- Marknader med prishistorik: 0 (utan: 0, fel: 0)
- Urval: avgjorda marknader med omsättning över 20 000 USD och tydligt resultat. Marknader som annullerats eller blev oklara saknas, vilket kan göra resultatet snällare än verkligheten.
- Historik garanterar inget. Ingen riktig handel.

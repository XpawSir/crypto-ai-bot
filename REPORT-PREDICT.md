# Test: prediktionsmarknader (Polymarket)

Pris 7 dagar före slut för avgjorda marknader, mot vad som faktiskt hände. Endast läsning av öppen data, ingen handel. Priset på det andra utfallet antas vara 1 minus första (ingen spread), vilket är snällt mot strategin.

| Prisgrupp (vid T−7d) | Antal | Snittpris | Andel som vann | Skillnad (pe) |
|---|---|---|---|---|
| 0.00–0.10 | 322 | 1.9 % | 3.1 % | 1.2 |
| 0.10–0.30 | 153 | 19.8 % | 31.4 % | 11.6 |
| 0.30–0.50 | 218 | 41.1 % | 37.2 % | -4.0 |
| 0.50–0.70 | 218 | 58.5 % | 62.4 % | 3.9 |
| 0.70–0.90 | 156 | 79.9 % | 68.6 % | -11.3 |
| 0.90–0.95 | 49 | 92.7 % | 91.8 % | -0.9 |
| 0.95–0.98 | 49 | 96.7 % | 91.8 % | -4.8 |
| 0.98–1.00 | 225 | 99.5 % | 99.1 % | -0.4 |

## Strategi: köp utfall som kostar 0,90–0,98 sju dagar före slut, håll till avgörande (kostnad 1 % per affär)

| Period | Affärer | Vinstandel | Snittavkastning per affär | Värsta affär |
|---|---|---|---|---|
| Hela urvalet | 100 | 92.0 % | -3.86 % | -100 % |
| Första halvan (tid) | 59 | 89.8 % | -6.19 % | -100 % |
| Andra halvan (tid) | 41 | 95.1 % | -0.51 % | -100 % |

Kriterier (satta före): minst 100 affärer, positiv avkastning efter 1 % kostnad i hela urvalet och i båda halvorna.

**Strategin klarar inte kriterierna** (eller för få affärer). Då är den bara ett pappersexperiment utan belägg.

## Anmärkningar
- Exempel: {"id":"1130012","question":"Will United Russia (ER) gain the most seats in the next Russian parliamentary election?","conditionId":"0x502a94e5c525766d5ee7f16c6568131ba1b2cbadb69c703af05a6ef00336ed64","slug":"will-united-russia-er-gain-the-most-seats-in-the-next-russian-parliamentary-election","endDa
- Avgjorda marknader hittade: 2393 av 5400 (avvisade: id/pris 0, kort liv/slutdatum 3003, ej tydligt avgjord 4)
- Marknader med prishistorik: 695 (utan: 205, fel: 0)
- Urval: avgjorda marknader med omsättning över 20 000 USD, som levt minst 14 dagar, högst 300 per månad (störst omsättning först), och tydligt resultat. Marknader som annullerats eller blev oklara saknas, vilket kan göra resultatet snällare än verkligheten.
- Historik garanterar inget. Ingen riktig handel.

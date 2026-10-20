# Test: kan aktiemomentum-boten förbättras?

Period 2010-03-15 – 2026-10-20 (16.6 år), mitten 2018-06-28. 30 stora amerikanska bolag (valda 2010), kostnad 0,12 % per sida. Botens nuvarande regel är "topp 5, justera ej, inget marknadsfilter". Kalmar = årlig tillväxt delat med värsta ras.

| Variant | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv., Kalmar) | 2:a halvan (tillv., Kalmar) |
|---|---|---|---|---|---|---|
| *Köp och behåll lika delar* | 14.6 % | −31.6 % | 0.46 | 1.8 | 13.9 %, 0.88 | 15.2 %, 0.48 |
| *Köp och behåll S&P 500 (SPY)* | 14.1 % | −33.7 % | 0.42 | 0 | 13.1 %, 0.70 | 15.1 %, 0.45 |
| Momentum 120d, topp 5, justera ej **(nuvarande bot)** | 17.5 % | −30.0 % | 0.58 | 43.9 | 15.3 %, 0.91 | 19.5 %, 0.65 |
| Momentum 120d, topp 5, lika delar månadsvis | 17.5 % | −30.1 % | 0.58 | 43.9 | 15.5 %, 0.91 | 19.3 %, 0.64 |
| Momentum 120d, topp 5, marknadsfilter, justera ej | 12.3 % | −26.9 % | 0.46 | 39.9 | 12.0 %, 0.64 | 12.4 %, 0.46 |
| Momentum 120d, topp 5, marknadsfilter, lika delar månadsvis | 12.7 % | −26.8 % | 0.47 | 39.9 | 12.2 %, 0.65 | 13.1 %, 0.49 |
| Momentum 120d, topp 10, justera ej | 14.5 % | −32.6 % | 0.45 | 62.7 | 13.1 %, 0.76 | 15.9 %, 0.49 |
| Momentum 120d, topp 10, lika delar månadsvis | 14.3 % | −33.9 % | 0.42 | 63.3 | 13.2 %, 0.76 | 15.2 %, 0.45 |
| Momentum 120d, topp 10, marknadsfilter, justera ej | 10.1 % | −31.3 % | 0.32 | 63.3 | 10.4 %, 0.71 | 9.8 %, 0.31 |
| Momentum 120d, topp 10, marknadsfilter, lika delar månadsvis | 10.4 % | −31.9 % | 0.33 | 63.5 | 10.4 %, 0.71 | 10.3 %, 0.32 |
| Momentum 250d, topp 5, justera ej | 15.4 % | −37.2 % | 0.41 | 31.9 | 15.9 %, 0.80 | 14.7 %, 0.40 |
| Momentum 250d, topp 5, lika delar månadsvis | 14.8 % | −36.8 % | 0.40 | 31.9 | 15.7 %, 0.79 | 13.8 %, 0.37 |
| Momentum 250d, topp 5, marknadsfilter, justera ej | 10.3 % | −31.4 % | 0.33 | 32.5 | 11.8 %, 0.64 | 8.7 %, 0.28 |
| Momentum 250d, topp 5, marknadsfilter, lika delar månadsvis | 10.3 % | −30.7 % | 0.34 | 32.5 | 11.7 %, 0.64 | 8.8 %, 0.29 |
| Momentum 250d, topp 10, justera ej | 15.9 % | −34.4 % | 0.46 | 40.1 | 15.4 %, 0.67 | 16.3 %, 0.48 |
| Momentum 250d, topp 10, lika delar månadsvis | 15.6 % | −34.4 % | 0.45 | 40.7 | 15.1 %, 0.66 | 16.1 %, 0.47 |
| Momentum 250d, topp 10, marknadsfilter, justera ej | 11.3 % | −30.7 % | 0.37 | 45.2 | 11.6 %, 0.65 | 11.0 %, 0.36 |
| Momentum 250d, topp 10, marknadsfilter, lika delar månadsvis | 11.6 % | −31.0 % | 0.37 | 45.2 | 11.3 %, 0.63 | 11.7 %, 0.38 |

## Paren: bättre Kalmar i båda halvorna?

| Ändring | Par som blir bättre i båda halvorna | Median ändring i tillväxt/år | Median ändring i värsta ras (procentenheter) | Beslut (kräver minst 6 av 8) |
|---|---|---|---|---|
| topp 10 i stället för topp 5 | 1 av 8 | -0.8 | +1.4 | antas inte |
| marknadsfilter (SPY över SMA 200) | 0 av 8 | -4.5 | -3.3 | antas inte |
| lika delar varje månad i stället för att inte justera | 1 av 8 | +0.0 | +0.0 | antas inte |

## Slutsats

**Ingen ändring uppfyller kravet.** Då lämnas botens regler som de är: att ändra efter att ha sett resultatet vore mest överanpassning.

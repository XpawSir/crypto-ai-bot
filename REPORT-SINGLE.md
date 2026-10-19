# Test: handel i enskilda aktier

Strategier på enskilda aktier (trendfilter, momentum, lågvolatilitet, återgång, utbrott), jämförda med att bara köpa och behålla lika delar. **Överlevnadsfel:** universum A är de 30 största bolagen i början av 2010, valda före perioden och med förlorare. Universum B är dagens största bolag, vilket gör alla siffror för vackra och visas bara för att visa hur stort felet är. Godkännandekriterierna sattes innan resultatet sågs (se kodens första kommentar). Historik garanterar inget, och kostnaden för spread och skatt är grovt räknad.

## A) De 30 största amerikanska bolagen i början av 2010 (litet överlevnadsfel)

Period 2010-03-15 – 2026-10-16 (16.6 år), delning för håll-ut-test 2018-06-27. 30 aktier med data. Kostnad 0,12 % per handlad krona, signal på gårdagens data. Kalmar = årlig tillväxt delat med värsta ras.

| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv., ras, Kalmar) | 2:a halvan (tillv., ras, Kalmar) |
|---|---|---|---|---|---|---|
| Köp och behåll Apple | 26.8 % | −43.8 % | 0.61 | 0.1 | 25.3 %, −44 %, 0.58 | 28.4 %, −39 %, 0.74 |
| Momentum 120d (hoppa 21d), topp 5, månadsvis | 17.3 % | −30.2 % | 0.58 | 43.9 | 15.7 %, −17 %, 0.92 | 19.2 %, −30 %, 0.64 |
| Trend: äg aktien över SMA 200, ombalans var 1:e dag | 7.1 % | −12.8 % | 0.55 | 254.7 | 6.7 %, −12 %, 0.56 | 7.5 %, −13 %, 0.58 |
| Lågvolatilitet: de 5 lugnaste (60d), månadsvis | 10.2 % | −22.1 % | 0.46 | 33.9 | 12.3 %, −16 %, 0.77 | 8.1 %, −22 %, 0.37 |
| Köp och behåll lika delar (månadsvis ombalans) | 14.6 % | −31.9 % | 0.46 | 1.8 | 14.0 %, −16 %, 0.90 | 15.2 %, −32 %, 0.48 |
| Momentum 250d (hoppa 21d), topp 10, månadsvis | 15.6 % | −34.4 % | 0.45 | 40.7 | 15.2 %, −23 %, 0.66 | 16.1 %, −34 %, 0.47 |
| Utbrott: köp nytt 100d-högsta, sälj nytt 50d-lägsta (dagligen) | 4.4 % | −9.8 % | 0.45 | 81.7 | 4.6 %, −9 %, 0.52 | 4.3 %, −10 %, 0.44 |
| Momentum 60d (hoppa 5d), topp 5, månadsvis | 13.5 % | −29.9 % | 0.45 | 59.9 | 15.4 %, −21 %, 0.75 | 11.6 %, −30 %, 0.39 |
| Trend: äg aktien över SMA 50, ombalans var 7:e dag | 5.7 % | −13.4 % | 0.43 | 219.2 | 5.9 %, −11 %, 0.56 | 5.5 %, −13 %, 0.41 |
| Momentum 60d (hoppa 5d), topp 10, månadsvis | 13.6 % | −31.9 % | 0.43 | 90.5 | 15.1 %, −17 %, 0.88 | 12.2 %, −32 %, 0.38 |
| Momentum 120d (hoppa 21d), topp 10, månadsvis | 14.2 % | −33.9 % | 0.42 | 63.4 | 13.3 %, −17 %, 0.76 | 15.2 %, −34 %, 0.45 |
| Momentum 250d (hoppa 21d), topp 5, månadsvis | 14.7 % | −36.8 % | 0.40 | 31.9 | 15.9 %, −20 %, 0.80 | 13.8 %, −37 %, 0.37 |
| Trend: äg aktien över SMA 200, ombalans var 7:e dag | 7.1 % | −18.1 % | 0.39 | 103.8 | 7.4 %, −12 %, 0.62 | 6.8 %, −18 %, 0.38 |
| Lågvolatilitet: de 10 lugnaste (60d), månadsvis | 9.8 % | −28.7 % | 0.34 | 45.5 | 10.6 %, −13 %, 0.79 | 9.0 %, −29 %, 0.31 |

### Familjer: hela rutnätet, inte bara de bästa

| Familj | Antal | Median tillväxt/år | Median värsta ras | Median Kalmar | Slår lika delar på Kalmar (1:a / 2:a halvan) | Median affärer/år |
|---|---|---|---|---|---|---|
| Trendfilter | 6 | 5.7 % | −14.4 % | 0.36 | 0/6 / 1/6 | 236.9 |
| Momentum | 6 | 14.5 % | −32.9 % | 0.44 | 1/6 / 1/6 | 51.9 |
| Lågvolatilitet | 2 | 10.0 % | −25.4 % | 0.40 | 0/2 / 0/2 | 39.7 |
| Återgång | 4 | -2.7 % | −47.0 % | -0.06 | 0/4 / 0/4 | 972.9 |
| Utbrott | 3 | 3.1 % | −11.5 % | 0.26 | 0/3 / 0/3 | 174.1 |

### Godkännandekriterier (satta före testet)

| Familj | Bästa raden | 1) slår lika delar på Kalmar i båda halvorna | 2) familjens median ≥ lika delar (2:a halvan) | 3) ≥ 70 % av lika delars tillväxt (2:a halvan) | 4) ≤ 150 affärer/år | Resultat |
|---|---|---|---|---|---|---|
| Trendfilter | Trend: äg aktien över SMA 200, ombalans var 1:e dag | nej | nej | nej | nej | klarar inte |
| Momentum | Momentum 120d (hoppa 21d), topp 5, månadsvis | ja | nej | ja | ja | klarar inte |
| Lågvolatilitet | Lågvolatilitet: de 5 lugnaste (60d), månadsvis | nej | nej | nej | ja | klarar inte |
| Återgång | Återgång: köp RSI(2) < 10 över SMA 200, sälj när RSI(2) > 60, max 10 aktier (dagligen) | nej | nej | nej | nej | klarar inte |
| Utbrott | Utbrott: köp nytt 100d-högsta, sälj nytt 50d-lägsta (dagligen) | nej | nej | nej | ja | klarar inte |

## B) Dagens största amerikanska bolag (STORT överlevnadsfel)

Period 2010-03-15 – 2026-10-16 (16.6 år), delning för håll-ut-test 2018-06-27. 30 aktier med data. Kostnad 0,12 % per handlad krona, signal på gårdagens data. Kalmar = årlig tillväxt delat med värsta ras.

| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv., ras, Kalmar) | 2:a halvan (tillv., ras, Kalmar) |
|---|---|---|---|---|---|---|
| Momentum 120d (hoppa 21d), topp 5, månadsvis | 37.6 % | −35.9 % | 1.05 | 40.5 | 38.9 %, −22 %, 1.76 | 36.5 %, −36 %, 1.02 |
| Momentum 250d (hoppa 21d), topp 5, månadsvis | 32.9 % | −32.7 % | 1.01 | 26.4 | 35.1 %, −29 %, 1.20 | 31.2 %, −33 %, 0.95 |
| Momentum 60d (hoppa 5d), topp 10, månadsvis | 27.0 % | −28.9 % | 0.93 | 88.5 | 29.2 %, −19 %, 1.57 | 25.0 %, −29 %, 0.86 |
| Momentum 120d (hoppa 21d), topp 10, månadsvis | 28.1 % | −31.3 % | 0.90 | 63.6 | 29.0 %, −17 %, 1.67 | 27.4 %, −31 %, 0.88 |
| Köp och behåll lika delar (månadsvis ombalans) | 23.8 % | −27.4 % | 0.87 | 1.8 | 24.8 %, −15 %, 1.68 | 23.0 %, −27 %, 0.84 |
| Momentum 60d (hoppa 5d), topp 5, månadsvis | 31.3 % | −37.3 % | 0.84 | 57.6 | 34.8 %, −22 %, 1.61 | 28.3 %, −37 %, 0.76 |
| Trend: äg aktien över SMA 200, ombalans var 1:e dag | 14.1 % | −17.1 % | 0.83 | 231.1 | 14.3 %, −11 %, 1.34 | 14.1 %, −17 %, 0.82 |
| Utbrott: köp nytt 100d-högsta, sälj nytt 50d-lägsta (dagligen) | 10.1 % | −12.7 % | 0.80 | 76.6 | 10.9 %, −8 %, 1.29 | 9.5 %, −13 %, 0.75 |
| Momentum 250d (hoppa 21d), topp 10, månadsvis | 23.5 % | −30.3 % | 0.78 | 45.5 | 25.8 %, −20 %, 1.28 | 21.4 %, −30 %, 0.71 |
| Utbrott: köp nytt 55d-högsta, sälj nytt 20d-lägsta (dagligen) | 6.6 % | −9.4 % | 0.70 | 175.2 | 6.1 %, −7 %, 0.84 | 7.2 %, −9 %, 0.76 |
| Trend: äg aktien över SMA 50, ombalans var 7:e dag | 11.2 % | −16.9 % | 0.66 | 214.4 | 11.7 %, −10 %, 1.21 | 10.8 %, −17 %, 0.64 |
| Utbrott: köp nytt 20d-högsta, sälj nytt 10d-lägsta (dagligen) | 7.1 % | −10.8 % | 0.65 | 368.6 | 6.1 %, −9 %, 0.68 | 8.1 %, −10 %, 0.85 |
| Trend: äg aktien över SMA 200, ombalans var 7:e dag | 14.4 % | −22.5 % | 0.64 | 94.1 | 15.0 %, −10 %, 1.50 | 13.9 %, −22 %, 0.62 |
| Lågvolatilitet: de 10 lugnaste (60d), månadsvis | 15.3 % | −24.5 % | 0.63 | 38.9 | 15.5 %, −12 %, 1.32 | 15.3 %, −24 %, 0.63 |
| Köp och behåll Apple | 26.8 % | −43.8 % | 0.61 | 0.1 | 25.3 %, −44 %, 0.58 | 28.4 %, −39 %, 0.74 |

### Familjer: hela rutnätet, inte bara de bästa

| Familj | Antal | Median tillväxt/år | Median värsta ras | Median Kalmar | Slår lika delar på Kalmar (1:a / 2:a halvan) | Median affärer/år |
|---|---|---|---|---|---|---|
| Trendfilter | 6 | 11.7 % | −18.3 % | 0.63 | 0/6 / 0/6 | 222.8 |
| Momentum | 6 | 29.7 % | −32.0 % | 0.92 | 1/6 / 4/6 | 51.6 |
| Lågvolatilitet | 2 | 13.6 % | −23.3 % | 0.58 | 0/2 / 0/2 | 32.5 |
| Återgång | 4 | 5.7 % | −26.1 % | 0.21 | 0/4 / 0/4 | 989.7 |
| Utbrott | 3 | 7.1 % | −10.8 % | 0.70 | 0/3 / 1/3 | 175.2 |

### Godkännandekriterier (satta före testet)

| Familj | Bästa raden | 1) slår lika delar på Kalmar i båda halvorna | 2) familjens median ≥ lika delar (2:a halvan) | 3) ≥ 70 % av lika delars tillväxt (2:a halvan) | 4) ≤ 150 affärer/år | Resultat |
|---|---|---|---|---|---|---|
| Trendfilter | Trend: äg aktien över SMA 200, ombalans var 1:e dag | nej | nej | nej | nej | klarar inte |
| Momentum | Momentum 120d (hoppa 21d), topp 5, månadsvis | ja | ja | ja | ja | **klarar** |
| Lågvolatilitet | Lågvolatilitet: de 10 lugnaste (60d), månadsvis | nej | nej | nej | ja | klarar inte |
| Återgång | Återgång: köp RSI(2) < 20 över SMA 200, sälj när RSI(2) > 60, max 10 aktier (dagligen) | nej | nej | nej | nej | klarar inte |
| Utbrott | Utbrott: köp nytt 100d-högsta, sälj nytt 50d-lägsta (dagligen) | nej | nej | nej | ja | klarar inte |

## Slutsats

**Ingen familj klarar alla fyra kriterier i universum A.** Då hör ingen aktiestrategi hemma som egen bot på sajten.

Familjer som inte klarar: Trendfilter (slår inte lika delar i båda halvor, medianen sämre än lika delar, tappar för mycket tillväxt, för många affärer); Momentum (medianen sämre än lika delar); Lågvolatilitet (slår inte lika delar i båda halvor, medianen sämre än lika delar, tappar för mycket tillväxt); Återgång (slår inte lika delar i båda halvor, medianen sämre än lika delar, tappar för mycket tillväxt, för många affärer); Utbrott (slår inte lika delar i båda halvor, medianen sämre än lika delar, tappar för mycket tillväxt).

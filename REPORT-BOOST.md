# Test: förbättringar av trendbotten (ränta på kontanter, filter, hävstång)

Yahoo Finance dagliga stängningar 2018-09-18 till 2026-10-20 (8.1 år), mitt 2022-10-04. Avgift 0,12 % per sida, signal på gårdagens data. Ränta 3,5 % på kontanter förutsätter att pengarna faktiskt står i ett räntekonto/penningmarknadsfond.

## BTC-USD

| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan | 2:a halvan |
|---|---|---|---|---|---|---|
| Nuvarande: över 50-d medel, allt eller inget (kontanter utan ränta) | 53.5 % | −58.3 % | 0.92 | 19.1 | 75.9 %, −49.6 % | 34.0 %, −31.6 % |
| A: samma + ränta 3,5 % på kontanter när ute | 56.0 % | −57.1 % | 0.98 | 19.1 | 79.0 %, −49.2 % | 36.0 %, −30.4 % |
| B: över 50-d OCH 200-d medel (långsammare filter) + ränta | 49.4 % | −50.1 % | 0.99 | 12.7 | 67.4 %, −50.1 % | 33.3 %, −27.6 % |
| C: över 50-d ELLER 200-d medel + ränta (kvar längre) | 42.9 % | −69.5 % | 0.62 | 14.0 | 56.6 %, −60.1 % | 30.4 %, −36.2 % |
| D: 50-d medel + bara in om pris också över 20-d högsta stängning-lågpunkt (momentum 20 d > 0) + ränta | 46.7 % | −58.0 % | 0.81 | 25.9 | 63.7 %, −46.7 % | 31.5 %, −32.1 % |
| E: 1,5x hävstång när över både 50-d och 200-d, annars 1x över 50-d, annars ute + ränta + lånekostnad | 68.2 % | −60.3 % | 1.13 | 21.6 | 93.3 %, −60.3 % | 46.4 %, −39.1 % |
| F: Köp och behåll (referens) | 37.2 % | −76.6 % | 0.49 | 0.1 | 32.1 %, −72.6 % | 41.3 %, −53.1 % |

## ETH-USD

| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan | 2:a halvan |
|---|---|---|---|---|---|---|
| Nuvarande: över 50-d medel, allt eller inget (kontanter utan ränta) | 57.3 % | −57.5 % | 1.00 | 19.5 | 109.5 %, −44.6 % | 18.1 %, −49.6 % |
| A: samma + ränta 3,5 % på kontanter när ute | 59.9 % | −56.4 % | 1.06 | 19.5 | 112.9 %, −44.5 % | 20.1 %, −48.6 % |
| B: över 50-d OCH 200-d medel (långsammare filter) + ränta | 51.3 % | −52.7 % | 0.97 | 12.8 | 101.6 %, −44.5 % | 13.6 %, −52.7 % |
| C: över 50-d ELLER 200-d medel + ränta (kvar längre) | 49.9 % | −70.8 % | 0.71 | 12.2 | 76.0 %, −70.8 % | 27.7 %, −42.8 % |
| D: 50-d medel + bara in om pris också över 20-d högsta stängning-lågpunkt (momentum 20 d > 0) + ränta | 46.7 % | −53.5 % | 0.87 | 30.4 | 90.1 %, −41.0 % | 13.2 %, −49.9 % |
| E: 1,5x hävstång när över både 50-d och 200-d, annars 1x över 50-d, annars ute + ränta + lånekostnad | 74.1 % | −63.5 % | 1.17 | 21.6 | 153.5 %, −54.3 % | 19.7 %, −62.5 % |
| F: Köp och behåll (referens) | 35.4 % | −79.4 % | 0.45 | 0.1 | 57.6 %, −79.4 % | 15.4 %, −67.6 % |

## Kriterier mot nuvarande regel (BTC och ETH var för sig)

| Kandidat | BTC bättre i båda halvor, ras ≤ +10 pe | ETH bättre i båda halvor, ras ≤ +10 pe | Godkänd |
|---|---|---|---|
| A: samma + ränta 3,5 % på kontanter när ute | ja | ja | **JA** |
| B: över 50-d OCH 200-d medel (långsammare filter) + ränta | nej | nej | nej |
| C: över 50-d ELLER 200-d medel + ränta (kvar längre) | nej | nej | nej |
| D: 50-d medel + bara in om pris också över 20-d högsta stängning-lågpunkt (momentum 20 d > 0) + ränta | nej | nej | nej |
| E: 1,5x hävstång när över både 50-d och 200-d, annars 1x över 50-d, annars ute + ränta + lånekostnad | ja | ja | **JA** |

Historik garanterar inget. Hävstång (E) kan ge totalförlust vid snabba fall och är ingen rekommendation.

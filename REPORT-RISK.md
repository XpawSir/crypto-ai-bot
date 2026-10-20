# Test: riskregler (volatilitetsmål, nedgångsbroms, regimfilter)

Yahoo Finance 2018-09-18 – 2026-10-20 (8.1 år), mitt 2022-10-04. Avgift 0,12 %/sida, ränta 3,5 % på kontanter, storlek i steg om 25 %.

## BTC-USD

| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |
|---|---|---|---|---|---|---|
| Nuvarande (50-d, allt eller inget, ränta) | 56.0 % | −57.1 % | 0.98 | 19.1 | 79.0 %, −49.2 %, 1.61 | 36.1 %, −30.4 %, 1.19 |
| V1: volatilitetsmål 80 %/år (max 1x) | 54.7 % | −57.1 % | 0.96 | 20.5 | 75.8 %, −44.9 %, 1.69 | 36.1 %, −30.4 %, 1.19 |
| V2: volatilitetsmål 60 %/år (max 1x) | 50.6 % | −57.6 % | 0.88 | 23.6 | 66.1 %, −44.5 %, 1.48 | 36.7 %, −30.4 %, 1.21 |
| V3: nedgångsbroms: halvera i 30 dagar efter −15 % från topp | 42.1 % | −40.7 % | 1.04 | 21.4 | 60.8 %, −34.2 %, 1.78 | 20.3 %, −25.5 %, 0.80 |
| V4: nedgångsbroms: halvera i 30 dagar efter −25 % från topp | 40.8 % | −45.3 % | 0.90 | 20.9 | 61.1 %, −38.6 %, 1.58 | 22.7 %, −28.2 %, 0.81 |
| V5: stå utanför när 30-d volatilitet över 120 %/år | 57.5 % | −57.1 % | 1.01 | 18.9 | 82.3 %, −45.3 %, 1.82 | 36.1 %, −30.4 %, 1.19 |
| V6: V2 + V3 tillsammans | 40.1 % | −40.8 % | 0.98 | 23.3 | 56.2 %, −33.7 %, 1.67 | 20.3 %, −25.5 %, 0.80 |

## ETH-USD

| Kandidat | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |
|---|---|---|---|---|---|---|
| Nuvarande (50-d, allt eller inget, ränta) | 59.9 % | −56.4 % | 1.06 | 19.5 | 112.9 %, −44.5 %, 2.53 | 20.1 %, −48.6 %, 0.41 |
| V1: volatilitetsmål 80 %/år (max 1x) | 55.1 % | −61.5 % | 0.90 | 23.6 | 101.1 %, −47.0 %, 2.15 | 19.7 %, −48.6 %, 0.41 |
| V2: volatilitetsmål 60 %/år (max 1x) | 50.9 % | −55.8 % | 0.91 | 27.7 | 90.8 %, −39.0 %, 2.33 | 19.4 %, −45.1 %, 0.43 |
| V3: nedgångsbroms: halvera i 30 dagar efter −15 % från topp | 36.8 % | −37.0 % | 0.99 | 21.7 | 71.7 %, −33.5 %, 2.14 | 14.5 %, −35.3 %, 0.41 |
| V4: nedgångsbroms: halvera i 30 dagar efter −25 % från topp | 40.4 % | −45.5 % | 0.89 | 21.4 | 80.3 %, −42.6 %, 1.89 | 9.1 %, −37.0 %, 0.25 |
| V5: stå utanför när 30-d volatilitet över 120 %/år | 53.7 % | −56.4 % | 0.95 | 18.8 | 96.8 %, −43.9 %, 2.20 | 20.1 %, −48.6 %, 0.41 |
| V6: V2 + V3 tillsammans | 44.4 % | −35.3 % | 1.26 | 24.0 | 82.5 %, −28.4 %, 2.90 | 13.1 %, −35.3 %, 0.37 |

## Kriterier mot nuvarande

| Kandidat | BTC | ETH | Godkänd |
|---|---|---|---|
| V1: volatilitetsmål 80 %/år (max 1x) | nej | nej | nej |
| V2: volatilitetsmål 60 %/år (max 1x) | nej | nej | nej |
| V3: nedgångsbroms: halvera i 30 dagar efter −15 % från topp | nej | nej | nej |
| V4: nedgångsbroms: halvera i 30 dagar efter −25 % från topp | nej | nej | nej |
| V5: stå utanför när 30-d volatilitet över 120 %/år | nej | nej | nej |
| V6: V2 + V3 tillsammans | nej | nej | nej |

Historik garanterar inget.

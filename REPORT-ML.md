# Test: maskininlärning (LightGBM) som handelssignal, walk-forward

## BTC-USD

Test 2020-01-01 – 2026-10-20 (6.8 år), mitt 2023-05-27. Omträning varje månad.

| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |
|---|---|---|---|---|---|---|
| Nuvarande trend (över 50-d) | 60.6 % | −57.1 % | 1.06 | 19.2 | 84.6 %, −57.1 %, 1.48 | 39.8 %, −30.3 %, 1.31 |
| Köp och behåll | 43.0 % | −76.6 % | 0.56 | 0.0 | 47.0 %, −76.6 %, 0.61 | 38.9 %, −53.1 %, 0.73 |
| ML: köp när P(upp) > 0.50 | 35.5 % | −62.5 % | 0.57 | 57.3 | 40.3 %, −62.5 %, 0.64 | 30.7 %, −53.0 %, 0.58 |
| ML: köp när P(upp) > 0.55 | 8.0 % | −67.0 % | 0.12 | 75.5 | 9.8 %, −67.0 %, 0.15 | 6.1 %, −57.8 %, 0.10 |
| ML: köp när P(upp) > 0.60 | 0.5 % | −67.3 % | 0.01 | 82.3 | 0.1 %, −67.3 %, 0.00 | 0.8 %, −53.3 %, 0.02 |
| ML + trend: P > 0.50 OCH över 50-d | 50.3 % | −39.9 % | 1.26 | 45.5 | 60.9 %, −39.9 %, 1.52 | 40.4 %, −31.4 %, 1.29 |
| ML + trend: P > 0.55 OCH över 50-d | 36.9 % | −39.2 % | 0.94 | 50.5 | 46.0 %, −31.7 %, 1.45 | 28.4 %, −39.2 %, 0.72 |
| ML + trend: P > 0.60 OCH över 50-d | 11.1 % | −40.1 % | 0.28 | 52.0 | 7.0 %, −40.1 %, 0.17 | 15.3 %, −33.6 %, 0.46 |

## ETH-USD

Test 2020-05-01 – 2026-10-20 (6.5 år), mitt 2023-07-27. Omträning varje månad.

| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |
|---|---|---|---|---|---|---|
| Nuvarande trend (över 50-d) | 56.5 % | −56.3 % | 1.00 | 19.6 | 89.4 %, −56.3 %, 1.59 | 29.6 %, −48.6 %, 0.61 |
| Köp och behåll | 45.5 % | −79.4 % | 0.57 | 0.0 | 95.2 %, −79.4 %, 1.20 | 8.6 %, −67.6 %, 0.13 |
| ML: köp när P(upp) > 0.50 | 13.0 % | −73.7 % | 0.18 | 57.7 | 12.4 %, −73.7 %, 0.17 | 13.8 %, −60.4 %, 0.23 |
| ML: köp när P(upp) > 0.55 | 11.4 % | −80.0 % | 0.14 | 69.2 | -7.5 %, −80.0 %, -0.09 | 34.4 %, −46.8 %, 0.74 |
| ML: köp när P(upp) > 0.60 | 1.5 % | −83.0 % | 0.02 | 73.2 | -21.7 %, −83.0 %, -0.26 | 32.0 %, −35.2 %, 0.91 |
| ML + trend: P > 0.50 OCH över 50-d | 7.3 % | −63.9 % | 0.11 | 39.8 | -0.2 %, −63.9 %, -0.00 | 15.5 %, −49.7 %, 0.31 |
| ML + trend: P > 0.55 OCH över 50-d | 10.4 % | −66.8 % | 0.16 | 42.9 | -0.3 %, −66.8 %, -0.01 | 22.6 %, −42.9 %, 0.53 |
| ML + trend: P > 0.60 OCH över 50-d | -0.6 % | −74.3 % | -0.01 | 42.3 | -17.3 %, −74.3 %, -0.23 | 19.7 %, −28.3 %, 0.70 |

## Kriterier (median över tröskelnätet mot nuvarande trend)

| Familj | BTC | ETH | Godkänd |
|---|---|---|---|
| ML ensam | nej | nej | nej |
| ML + trend | nej | nej | nej |

Historik garanterar inget. Modellen är liten och regulariserad (200 träd, djup 3).

# Test: maskininlärning (LightGBM) som signal för BTC och ETH, walk-forward.
# Månatlig omträning på ALL data före testmånaden (med 7 dagars avstånd för att inte läcka framtiden).
# Signalen på gårdagens data, handel på dagens stängning, avgift 0,12 % per sida, ränta 3,5 % på kontanter.
# KRITERIER (satta innan resultat): maskininlärningsregeln godkänns bara om medianen över hela tröskelnätet (0,50/0,55/0,60)
# har högre Kalmar än nuvarande trendregel (över 50-d medel) i BÅDA halvorna för BÅDE BTC och ETH.
import json, os, sys, time, urllib.request
import numpy as np, pandas as pd, lightgbm as lgb

COST = 0.0012; RATE = 0.035 / 365
OUT = os.environ.get('RESEARCH_OUT', 'research-out'); os.makedirs(OUT, exist_ok=True)

def yahoo(sym):
    url = f'https://query1.finance.yahoo.com/v8/finance/chart/{sym}?period1=1388534400&period2={int(time.time())}&interval=1d'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (compatible; cryptoai-research)'})
    j = json.load(urllib.request.urlopen(req, timeout=30))['chart']['result'][0]
    q = j['indicators']['quote'][0]
    df = pd.DataFrame({'close': q['close'], 'vol': q['volume']}, index=pd.to_datetime(j['timestamp'], unit='s').normalize())
    return df[~df.index.duplicated()].dropna(subset=['close'])

def features(df):
    c = df['close']; r = c.pct_change(); f = pd.DataFrame(index=df.index)
    for n in (1, 5, 20, 60): f[f'ret{n}'] = c.pct_change(n)
    for n in (20, 50, 200): f[f'gap{n}'] = c / c.rolling(n).mean() - 1
    v = r.rolling(30).std() * np.sqrt(365); f['vol30'] = v
    f['volpct'] = v.rolling(365).rank(pct=True)
    f['dd365'] = c / c.rolling(365).max() - 1
    f['relvol'] = df['vol'] / df['vol'].rolling(30).median()
    f['sma50up'] = (c > c.rolling(50).mean()).astype(float)
    return f

def metrics(eq):
    eq = np.asarray(eq); yrs = len(eq) / 365
    peak = np.maximum.accumulate(eq); dd = ((peak - eq) / peak).max()
    cagr = (eq[-1] / eq[0]) ** (1 / yrs) - 1
    return cagr * 100, dd * 100, (cagr / dd if dd > 0 else 0)

def run_pos(ret, pos):
    # pos[i] = position tagen vid stängning i (beslutad på data till i-1); avkastning dag i+1
    eq = [1.0]; prev = 0.0
    for i in range(len(ret) - 1):
        p = pos[i]; cost = COST * abs(p - prev) * 1.0
        r = p * ret[i + 1] + (1 - p) * RATE
        eq.append(eq[-1] * (1 + r - cost)); prev = p
    return np.array(eq), sum(1 for i in range(1, len(pos)) if pos[i] != pos[i - 1])

res = {}; L = ['# Test: maskininlärning (LightGBM) som handelssignal, walk-forward', '']
THR = [0.50, 0.55, 0.60]
for sym in ['BTC-USD', 'ETH-USD']:
    df = yahoo(sym); F = features(df); c = df['close']
    ret = c.pct_change().values
    y = (c.shift(-6) / c.shift(-1) - 1 > 0).astype(float)   # 5 dagars framtida utfall räknat från morgondagens stängning
    X = F.shift(1)                                         # gårdagens data
    start = pd.Timestamp('2020-01-01'); idx = df.index
    proba = pd.Series(np.nan, index=idx)
    months = pd.period_range(start, idx[-1], freq='M')
    for m in months:
        a, b = m.start_time, m.end_time
        tr = (idx < a - pd.Timedelta(days=8)) & X.notna().all(axis=1).values & y.notna().values
        te = (idx >= a) & (idx <= b)
        if tr.sum() < 500 or te.sum() == 0: continue
        mdl = lgb.LGBMClassifier(n_estimators=200, max_depth=3, learning_rate=0.05, min_child_samples=50, reg_lambda=10, subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, random_state=1)
        mdl.fit(X[tr], y[tr])
        ok = te & X.notna().all(axis=1).values
        proba[ok] = mdl.predict_proba(X[ok])[:, 1]
    ev = proba.notna().values & (idx >= start)
    # begränsa till perioden med förutsägelser
    i0 = np.where(ev)[0][0]; rr = ret[i0:]; pp = proba.values[i0:]; trend = (F['sma50up'].shift(1).values[i0:])
    n = len(rr); mid = n // 2
    strategies = {'Nuvarande trend (över 50-d)': trend, 'Köp och behåll': np.ones(n)}
    for t in THR: strategies[f'ML: köp när P(upp) > {t:.2f}'] = (pp > t).astype(float)
    for t in THR: strategies[f'ML + trend: P > {t:.2f} OCH över 50-d'] = ((pp > t) & (trend > 0)).astype(float)
    L += [f'## {sym}', '', f'Test {idx[i0].date()} – {idx[-1].date()} ({n/365:.1f} år), mitt {idx[i0+mid].date()}. Omträning varje månad.', '',
          '| Strategi | Tillväxt/år | Värsta ras | Kalmar | Affärer/år | 1:a halvan (tillv, ras, Kalmar) | 2:a halvan (tillv, ras, Kalmar) |', '|---|---|---|---|---|---|---|']
    store = {}
    for name, pos in strategies.items():
        pos = np.nan_to_num(pos)
        eq, tr_n = run_pos(rr, pos)
        e1, _ = run_pos(rr[:mid], pos[:mid]); e2, _ = run_pos(rr[mid:], pos[mid:])
        a, h1, h2 = metrics(eq), metrics(e1), metrics(e2)
        store[name] = (a, h1, h2)
        f = lambda m: f'{m[0]:.1f} %, −{m[1]:.1f} %, {m[2]:.2f}'
        L.append(f'| {name} | {a[0]:.1f} % | −{a[1]:.1f} % | {a[2]:.2f} | {tr_n/(n/365):.1f} | {f(h1)} | {f(h2)} |')
    L.append('')
    res[sym] = store

L += ['## Kriterier (median över tröskelnätet mot nuvarande trend)', '', '| Familj | BTC | ETH | Godkänd |', '|---|---|---|---|']
for fam, tag in [('ML ensam', 'ML: köp'), ('ML + trend', 'ML + trend')]:
    oks = []
    for sym in res:
        st = res[sym]; base = st['Nuvarande trend (över 50-d)']
        mine = [v for k, v in st.items() if k.startswith(tag)]
        ok = all(np.median([m[h][2] for m in mine]) > base[h][2] for h in (1, 2))
        oks.append(ok)
    L.append(f'| {fam} | {"ja" if oks[0] else "nej"} | {"ja" if oks[1] else "nej"} | {"**JA**" if all(oks) else "nej"} |')
L += ['', 'Historik garanterar inget. Modellen är liten och regulariserad (200 träd, djup 3).']
open(os.path.join(OUT, 'REPORT-ML.md'), 'w').write('\n'.join(L) + '\n'); print('\n'.join(L))

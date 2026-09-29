"""Turn the digitised Bloomberg forward-P/E band + Nifty daily closes into a daily series.

Steps
1. Read the orange stroke band (top/bottom pixel) for every pixel column (strict orange mask,
   legend area and red-annotation overlaps handled).
2. Stroke half-thickness h from the thinnest (flat) stretches of the band. The true line centre at
   column x must lie inside [top+h, bottom-h]  -> a hard constraint interval per column.
3. For each trading day, find its column via the year-tick calibration plus a small date shift s.
   PE_mid = value at the band midpoint.
4. Implied forward EPS = close / PE_mid, smoothed with a centred rolling median (21 trading days).
   Reconstructed daily P/E = close / smoothed EPS (restores day-to-day moves from actual prices).
5. Choose s (and report) by maximising the share of days whose reconstructed P/E sits inside the
   constraint interval. That share is the headline accuracy check.

Usage: python3 build_series.py <price_csv_glob> <out_csv>
"""
import sys, glob, csv, json, datetime as dt
import numpy as np
import pandas as pd
from PIL import Image

IMG = '/root/.claude/uploads/79809461-fe1d-550f-bdd0-e82c580f77b9/14ca7aa7-image.jpg'
AY, BY = -0.007874014813994716, 27.47693925827221      # pe = AY*y + BY   (gridline fit)
AX, BX = 0.7334791154263993, -246.85740320287925        # days since 2020-01-01 = AX*x + BX (tick fit)
BASE = pd.Timestamp('2020-01-01')
X_END = 3698                                             # last column of the real line (strict mask)
MED_WIN = 21

# ---------------------------------------------------------------- band per column
im = np.asarray(Image.open(IMG)).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
orange = (R > 225) & (G > 125) & (G < 195) & (B < 70)
orange[:320, :] = False
red = (R > 170) & (G < 90) & (B < 90)
dark = (R < 90) & (G < 90) & (B < 90)

cols = np.nonzero(orange.any(axis=0))[0]
x0 = int(cols.min())

# stroke width: modal horizontal run length of the strict mask (steep segments) ~ 8-9 px
runs = []
for yy in range(330, 2100):
    xx = np.nonzero(orange[yy])[0]
    if len(xx):
        runs += [len(r) for r in np.split(xx, np.nonzero(np.diff(xx) > 1)[0] + 1)]
runs = np.array(runs)
vals_, cnts_ = np.unique(runs[(runs >= 5) & (runs <= 20)], return_counts=True)
top2 = vals_[np.argsort(cnts_)[-2:]]
h = float(np.mean(top2)) / 2.0                           # half stroke width (px)

occluder = red | dark
full_x = np.arange(x0, X_END + 1)
TOP = np.full(len(full_x), np.nan); BOT = np.full(len(full_x), np.nan)
TOP_OK = np.zeros(len(full_x), bool); BOT_OK = np.zeros(len(full_x), bool)
for i, x in enumerate(full_x):
    ys = np.nonzero(orange[:, x])[0]
    if len(ys) == 0:
        continue
    top, bot = int(ys.min()), int(ys.max())
    TOP[i], BOT[i] = top, bot
    # an edge is trustworthy only if no occluder sits right against it (it could hide more stroke)
    TOP_OK[i] = not occluder[max(0, top - 4):top, max(0, x - 1):x + 2].any()
    BOT_OK[i] = not occluder[bot + 1:bot + 5, max(0, x - 1):x + 2].any()

def col_vals(xf):
    """Band at fractional column xf -> (pe_mid or nan, lower bound on value, upper bound on value)."""
    i = np.clip(np.rint(xf - x0).astype(int), 0, len(full_x) - 1)
    t, b = TOP[i], BOT[i]
    tok, bok = TOP_OK[i], BOT_OK[i]
    both = tok & bok & ~np.isnan(t)
    mid = np.where(both, (t + b) / 2, np.nan)
    # centre pixel c satisfies c >= top+h (if top visible) and c <= bot-h (if bottom visible)
    c_min = np.where(tok, t + h, -np.inf)                 # smallest allowed pixel row -> largest value
    c_max = np.where(bok, b - h, np.inf)                  # largest allowed pixel row  -> smallest value
    fix = both & (c_min > c_max)
    c_min = np.where(fix, mid, c_min); c_max = np.where(fix, mid, c_max)
    v_hi = np.where(np.isfinite(c_min), AY * c_min + BY, np.inf)
    v_lo = np.where(np.isfinite(c_max), AY * c_max + BY, -np.inf)
    return AY * mid + BY, v_lo, v_hi

# ---------------------------------------------------------------- prices
def load_prices(pattern):
    frames = []
    for p in sorted(glob.glob(pattern)):
        df = pd.read_csv(p, dtype={'volume': 'float64'})
        frames.append(df)
    px = pd.concat(frames).drop_duplicates('date').sort_values('date')
    px['date'] = pd.to_datetime(px['date'])
    # Yahoo fills exchange holidays with a flat row and no volume: drop those
    flat = px['close'].eq(px['close'].shift()) & (px['volume'].isna() | px['volume'].eq(0))
    dropped = px.loc[flat, 'date'].dt.strftime('%Y-%m-%d').tolist()
    return px.loc[~flat, ['date', 'close']].reset_index(drop=True), dropped

def build(px, shift):
    d = (px['date'] - BASE).dt.days.to_numpy(float) - shift
    xf = (d - BX) / AX
    # round line caps extend ~h px beyond the first/last data vertex: keep only true vertices
    ok = (xf >= x0 + h) & (xf <= X_END - h)
    out = px.loc[ok].copy()
    mid, clo, chi = col_vals(xf[ok])
    out['x'] = xf[ok]
    out['pe_dig'] = mid
    out['pe_band_lo'] = clo
    out['pe_band_hi'] = chi
    out['eps_raw'] = out['close'] / out['pe_dig']          # NaN where an edge is hidden
    out['eps_s'] = out['eps_raw'].rolling(MED_WIN, center=True, min_periods=3).median()
    out['eps_s'] = out['eps_s'].interpolate(limit_direction='both')
    out['pe_rec'] = out['close'] / out['eps_s']
    tol = 0.02
    out['in_band'] = (out['pe_rec'] >= out['pe_band_lo'] - tol) & (out['pe_rec'] <= out['pe_band_hi'] + tol)
    return out.reset_index(drop=True)

if __name__ == '__main__':
    pattern, out_csv = sys.argv[1], sys.argv[2]
    px, dropped = load_prices(pattern)
    scores = []
    for s in np.arange(-6, 6.01, 0.25):
        b = build(px, s)
        scores.append((float(b['in_band'].mean()), float(np.sqrt(((b['pe_rec'] - b['pe_dig']) ** 2).mean(skipna=True))), float(s)))
    best = max(scores, key=lambda t: (round(t[0], 4), -t[1]))
    res = build(px, best[2])
    res.to_csv(out_csv, index=False, float_format='%.6f')
    err = res['pe_rec'] - res['pe_dig']
    report = {
        'price_rows': len(px), 'dropped_holiday_rows': dropped, 'rows_out': len(res),
        'first': res['date'].min().strftime('%Y-%m-%d'), 'last': res['date'].max().strftime('%Y-%m-%d'),
        'half_thickness_px': h, 'half_thickness_pe': h * abs(AY),
        'best_shift_days': best[2], 'in_band_share': best[0], 'rmse_rec_vs_mid': best[1],
        'max_abs_rec_vs_mid': float(err.abs().max()),
        'worst_days': res.loc[err.abs().nlargest(8).index, ['date', 'close', 'pe_dig', 'pe_band_lo', 'pe_band_hi', 'pe_rec']]
                        .assign(date=lambda d: d['date'].dt.strftime('%Y-%m-%d')).round(3).to_dict('records'),
        'score_curve': [(s, round(a, 4), round(r, 4)) for a, r, s in scores],
    }
    json.dump(report, open(out_csv.replace('.csv', '_report.json'), 'w'), indent=1, default=str)
    print(json.dumps({k: v for k, v in report.items() if k != 'score_curve'}, indent=1, default=str))
    print('score curve (shift, in_band, rmse):')
    for t in report['score_curve']:
        print('  ', t)

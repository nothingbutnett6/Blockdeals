"""Digitise the orange Nifty 50 12m forward P/E line from the user's Bloomberg chart.

Y calibration: gridline rows (24..12) fitted linearly.
X calibration: major year ticks (Jan 1 of 2020..2026) fitted linearly (days since 2020-01-01).
Output: per-pixel-column series (x, date, pe_center, pe_min, pe_max, n_px, occluded flag).
"""
import numpy as np, datetime as dt, json, csv
from PIL import Image

IMG = '/root/.claude/uploads/79809461-fe1d-550f-bdd0-e82c580f77b9/14ca7aa7-image.jpg'
im = np.asarray(Image.open(IMG)).astype(int)
R, G, B = im[..., 0], im[..., 1], im[..., 2]
H, W = R.shape

# --- Y calibration from gridline centres (rows found by scanning for long light-grey rows)
grid = {24: 441.5, 22: 695.5, 20: 949.5, 18: 1204.0, 16: 1457.5, 14: 1711.5, 12: 1965.5}
gy = np.array(list(grid.values())); gv = np.array(list(grid.keys()), float)
ay, by = np.polyfit(gy, gv, 1)              # value = ay*y + by
y_resid = gv - (ay * gy + by)

# --- X calibration from major tick centres (Jan 1 of each year)
ticks = {2020: 336.5, 2021: 835.5, 2022: 1333.5, 2023: 1830.5, 2024: 2328.5, 2025: 2827.5, 2026: 3325.0}
base = dt.date(2020, 1, 1)
tx = np.array(list(ticks.values())); td = np.array([(dt.date(y, 1, 1) - base).days for y in ticks], float)
ax_, bx_ = np.polyfit(tx, td, 1)            # days = ax*x + bx
x_resid = td - (ax_ * tx + bx_)

orange = (R > 200) & (G > 110) & (G < 205) & (B < 110) & ((R - B) > 120)
red = (R > 170) & (G < 90) & (B < 90)
dark = (R < 110) & (G < 110) & (B < 110)
orange[:320, :] = False                     # drop legend swatch/title area

rows = []
cols = np.nonzero(orange.any(axis=0))[0]
for x in range(cols.min(), cols.max() + 1):
    ys = np.nonzero(orange[:, x])[0]
    occl = bool(red[1200:2100, max(0, x-2):x+3].any() or dark[1338:1350, x].any())
    if len(ys) == 0:
        rows.append((x, None, None, None, 0, occl)); continue
    # keep the largest contiguous run (guards against stray pixels)
    runs = np.split(ys, np.nonzero(np.diff(ys) > 3)[0] + 1)
    run = max(runs, key=len)
    rows.append((x, float(run.mean()), float(run.min()), float(run.max()), len(run), occl))

def val(y): return None if y is None else ay * y + by
def day(x): return ax_ * x + bx_

out = []
for x, yc, ymin, ymax, n, occl in rows:
    d = base + dt.timedelta(days=float(day(x)))
    out.append({'x': x, 'date': d.isoformat(), 'days': round(float(day(x)), 3),
                'pe': None if yc is None else round(val(yc), 4),
                'pe_hi': None if ymin is None else round(val(ymin), 4),
                'pe_lo': None if ymax is None else round(val(ymax), 4),
                'npx': n, 'occluded': occl})

with open('pe_columns.csv', 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(out[0].keys())); w.writeheader(); w.writerows(out)

meta = {'y_fit': [ay, by], 'y_resid_max': float(abs(y_resid).max()), 'px_per_pe_unit': 1/abs(ay),
        'x_fit': [ax_, bx_], 'x_resid_days_max': float(abs(x_resid).max()), 'px_per_day': 1/ax_,
        'first_col': out[0]['date'], 'last_col': out[-1]['date'], 'n_cols': len(out),
        'empty_cols': sum(1 for r in out if r['pe'] is None)}
json.dump(meta, open('calibration.json', 'w'), indent=1)
print(json.dumps(meta, indent=1))
valid = [r for r in out if r['pe'] is not None]
lo = min(valid, key=lambda r: r['pe_lo']); hi = max(valid, key=lambda r: r['pe_hi'])
print('min (line bottom) ', lo['date'], lo['pe_lo'], ' centre', lo['pe'])
print('max (line top)    ', hi['date'], hi['pe_hi'], ' centre', hi['pe'])
print('first 3', valid[:3]); print('last 5', valid[-5:])
thick = np.median([r['npx'] for r in valid]); print('median run px (line thickness)', thick)

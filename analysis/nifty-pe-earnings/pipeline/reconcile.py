#!/usr/bin/env python3
"""Compare two independent transcriptions (A, B) of one price chunk.

Usage:
  python3 reconcile.py <chunk_id>                      # diff A vs B; if identical, write final/<chunk_id>.csv
  python3 reconcile.py <chunk_id> --apply <corr.json>  # apply corrections (dict date -> row) on top of A∩B, write final

CSV format (header required): date,close[,volume]  (A and B must share the same header)
  date ISO YYYY-MM-DD; numbers plain (no thousands separators); volume empty when Yahoo shows '-'.
"""
import csv, json, sys, os

BASE = os.path.dirname(os.path.abspath(__file__))
FIELDS = None  # set from A's header


def load(path):
    global FIELDS
    rows = {}
    with open(path, newline="") as f:
        r = csv.DictReader(f)
        hdr = [h.strip() for h in (r.fieldnames or [])]
        if FIELDS is None:
            FIELDS = hdr
        if hdr != FIELDS or hdr[:2] != ["date", "close"]:
            sys.exit(f"ERROR {path}: header {hdr} must equal {FIELDS} and start with date,close")
        for line in r:
            d = line["date"].strip()
            rec = {}
            for k in FIELDS[1:]:
                v = (line.get(k) or "").strip().replace(",", "")
                if v in ("", "-"):
                    rec[k] = None
                else:
                    rec[k] = float(v)
            if d in rows:
                print(f"WARN duplicate date {d} in {os.path.basename(path)}")
            rows[d] = rec
    return rows


def same(x, y):
    if x is None or y is None:
        return x is None and y is None
    return abs(x - y) < 1e-9


def ohlc_issues(rows):
    """Flag missing closes and day-on-day moves over 15% (to be eyeballed, not auto-fixed)."""
    out, prev = [], None
    for d, r in sorted(rows.items()):
        c = r["close"]
        if c is None:
            out.append((d, "missing close"))
            continue
        if prev and abs(c / prev - 1) > 0.15:
            out.append((d, f"big move {prev} -> {c} ({(c/prev-1)*100:.1f}%)"))
        prev = c
    return out


def write_final(chunk, rows):
    path = os.path.join(BASE, "final", f"{chunk}.csv")
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(FIELDS)
        for d in sorted(rows):
            r = rows[d]
            w.writerow([d] + ["" if r[k] is None else (int(r[k]) if k == "volume" else r[k]) for k in FIELDS[1:]])
    return path


def main():
    chunk = sys.argv[1]
    a = load(os.path.join(BASE, "raw", f"{chunk}_A.csv"))
    b = load(os.path.join(BASE, "raw", f"{chunk}_B.csv"))
    only_a = sorted(set(a) - set(b))
    only_b = sorted(set(b) - set(a))
    diffs = []
    for d in sorted(set(a) & set(b)):
        bad = {k: [a[d][k], b[d][k]] for k in FIELDS[1:] if not same(a[d][k], b[d][k])}
        if bad:
            diffs.append({"date": d, "fields": bad})

    if "--apply" in sys.argv:
        corr = json.load(open(sys.argv[sys.argv.index("--apply") + 1]))
        merged = {d: a[d] for d in set(a) & set(b) if not any(x["date"] == d for x in diffs)}
        for d, r in corr.items():
            if r is None:  # explicit removal (date should not exist)
                merged.pop(d, None)
                continue
            merged[d] = {k: (None if r.get(k) in (None, "", "-") else float(str(r[k]).replace(",", ""))) for k in FIELDS[1:]}
        unresolved = [d for d in only_a + only_b + [x["date"] for x in diffs] if d not in corr]
        if unresolved:
            print(json.dumps({"status": "UNRESOLVED", "dates": unresolved}))
            sys.exit(2)
        p = write_final(chunk, merged)
        print(json.dumps({"status": "WRITTEN_WITH_CORRECTIONS", "rows": len(merged), "path": p,
                          "ohlc_issues": ohlc_issues(merged)}))
        return

    if not only_a and not only_b and not diffs:
        p = write_final(chunk, a)
        print(json.dumps({"status": "MATCH", "rows": len(a), "first": min(a), "last": max(a), "path": p,
                          "ohlc_issues": ohlc_issues(a)}))
    else:
        print(json.dumps({"status": "MISMATCH", "rows_A": len(a), "rows_B": len(b),
                          "only_in_A": only_a, "only_in_B": only_b, "value_diffs": diffs}, indent=1))
        sys.exit(1)


if __name__ == "__main__":
    main()

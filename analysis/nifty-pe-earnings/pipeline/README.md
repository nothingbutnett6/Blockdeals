# How the Nifty P/E chart was built

1. `data/nifty50_daily_close_2019-10_to_2026-09-28.csv`: Nifty 50 (^NSEI) daily closes from Yahoo Finance history pages. Each year was transcribed twice by independent agents; `reconcile.py` diffed the two copies (all 1,728 rows matched) and every month-end close was checked against Yahoo's monthly table.
2. `digitize.py`: calibrates the Bloomberg chart image ("Indian Stocks Cheapest Since 2020 by Forward P/E"). Gridlines 12 to 24 fix the y scale (largest residual 0.003x) and year ticks fix the x scale (largest residual 0.24 days). The image itself is not stored here because it is Bloomberg's content; the scripts expect it at the path set in `IMG`.
3. `build_series.py`: reads the top and bottom edge of the orange line for every trading day and turns them into a band the true value must lie in (edge minus half the 8.5 px stroke width). It picks the date alignment (1 day) that puts the most rebuilt values inside the band. The output is `data/bloomberg_fwd_pe_digitised.csv`; blank or infinite bounds mark edges hidden by the red annotations.
4. `build_excel.py`: writes the workbook. Implied EPS, the 21-day median EPS, the rebuilt P/E, the indices and every summary figure are Excel formulas, recalculated with LibreOffice (12,075 formulas, 0 errors).
5. `render.py`: exports the Chart sheet to PDF with LibreOffice and rasterises it to the PNG.

Accuracy: the rebuilt P/E sits inside the chart band on 86% of days. Against seven forward P/E figures that news reports attributed to Bloomberg, the gap is -0.36x to +0.34x. Treat every P/E as accurate to about ±0.3x.

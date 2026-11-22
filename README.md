# makefun-csv-reader

[![make.fun · csv-reader-speed-01-run-20261121](https://make.fun/badge/csv-reader-speed-01-run-20261121.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![rank](https://make.fun/badge/csv-reader-speed-01-run-20261121/sizumita/makefun-csv-reader/rank.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)
[![reward](https://make.fun/badge/csv-reader-speed-01-run-20261121/sizumita/makefun-csv-reader/reward.svg)](https://make.fun/bounty/csv-reader-speed-01-run-20261121?utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121)

A faster drop-in for csv-reader 1.0.0: a dependency-free ES module whose
run(input) returns exactly csv-reader's {columns, rows, errors} on every
input — BOM handling, stray_cr, quote_junk, unterminated_quote re-read,
doubled quotes, CRLF/CR inside quotes read as LF, short_row/long_row with
fields/extra, and exact line/row error accounting. A clean-line fast path
(split) serves records with no quote and no stray CR; everything else goes
through a single-pass charCode scanner that slices whole field segments.
Locally on the 10.2 MB practice set it runs about 5–6x faster than the
house baseline (median ~130 ms vs ~825 ms CPU per set, Node 24, shared VM).

## Run it

```sh
node main.ts
```

(with MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR pointing at the case input and
output directories outside the harness container)

---

<sub>Entered on [make.fun](https://make.fun/?ref=tjxzfppk&utm_source=github&utm_medium=readme&utm_campaign=csv-reader-speed-01-run-20261121) · AI agents build software for cash rewards</sub>

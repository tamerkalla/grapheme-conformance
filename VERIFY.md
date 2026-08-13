# VERIFY

Run one command:

```
npm run scoreboard
```

It builds the package, scores every library against every vendored copy of
Unicode's `GraphemeBreakTest.txt`, writes `SCOREBOARD.md`, and prints the table
below to stdout.

## Expected output

Compare ten integers. These two columns are the specified baseline.

| implementation | U15.1.0 (1187) | U16.0.0 (1093) |
|---|---|---|
| `Intl.Segmenter` | 1186 | 1092 |
| `unicode-segmenter` | 1186 | 1092 |
| `graphemer` | 1180 | 1086 |
| `grapheme-splitter` | 1175 | 1081 |
| `runes2` | 730 | 695 |

The printed table shows each cell as `passed/total (rate%)`; the integer to
check is the one before the slash. If all ten match, the build is correct.

## One caveat, and it is the only one

`Intl.Segmenter` is not a fixed library. It is scored against whatever ICU the
host Node ships, so its row moves with the runtime. Measured across the CI
matrix:

| runtime | 15.1.0 | 16.0.0 | `2701 200D 2701` |
|---|---|---|---|
| Node 22.22.2 (ICU 78.2) | 1186 | 1092 | split, the known deviation |
| Node 20.x | 1186 | 1092 | split |
| Node 18.20.8 | 1187 | 1093 | not split |

Run `npm run scoreboard` on Node 22 or 20 to get the two baseline numbers. On
Node 18 the `Intl.Segmenter` row reads `1187` and `1093` instead: that ICU
predates the deviation and passes every case. The other four rows are pinned to
exact versions and hold identically on every Node.

The baseline was verified on Node 22.22.2 (ICU 78.2, Unicode 17.0).

## Everything else

```
npm test        # 104 assertions, offline, including all ten integers above
npm run typecheck
npm run build
npm run smoke   # loads the ESM and CJS entry points and scores Intl.Segmenter
npm run scoreboard:check   # asserts SCOREBOARD.md is byte-identical to a fresh run
```

No network access is required by any of these. The vectors are committed under
`vectors/` and are never fetched.

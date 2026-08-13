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
host Node ships, so its two numbers are `1186` and `1092` only on a Node whose
ICU implements Unicode 15.1 or later — Node 22 does, Node 18 and 20 do not.
The other four rows are pinned to exact versions and hold on every Node.

Verified on Node 22.22.2 (ICU 78.2, Unicode 17.0).

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

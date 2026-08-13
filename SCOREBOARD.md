# Scoreboard

Cases passed against Unicode's official `GraphemeBreakTest.txt`, by Unicode
version. Case counts are in the column headers.

| implementation | 15.0.0 (602) | 15.1.0 (1187) | 16.0.0 (1093) | 17.0.0 (766) |
|---|---|---|---|---|
| `Intl.Segmenter` | 601/602 (99.83%) | 1186/1187 (99.92%) | 1092/1093 (99.91%) | 766/766 (100.00%) |
| `unicode-segmenter` | 601/602 (99.83%) | 1186/1187 (99.92%) | 1092/1093 (99.91%) | 766/766 (100.00%) |
| `graphemer` | 602/602 (100.00%) | 1180/1187 (99.41%) | 1086/1093 (99.36%) | 749/766 (97.78%) |
| `grapheme-splitter` | 597/602 (99.17%) | 1175/1187 (98.99%) | 1081/1093 (98.90%) | 746/766 (97.39%) |
| `runes2` | 412/602 (68.44%) | 730/1187 (61.50%) | 695/1093 (63.59%) | 501/766 (65.40%) |

---

Generated 2026-08-13 by `npm run scoreboard`. Versions under test:

| implementation | version |
|---|---|
| `Intl.Segmenter` | ICU, Unicode 17.0 |
| `unicode-segmenter` | 0.17.3 |
| `graphemer` | 1.4.0 |
| `grapheme-splitter` | 1.0.4 |
| `runes2` | 1.1.4 |

`Intl.Segmenter` is scored against the host ICU, so its row depends on the
runtime the scoreboard was generated on. The other rows do not.

# VERIFY

This reproduces the scoreboard's two Unicode-16.0.0-and-15.1.0 columns from the
published package, in a clean directory. It does not require this repository
to be checked out.

```bash
mkdir -p grapheme-conformance-verify && cd grapheme-conformance-verify
npm init -y >/dev/null 2>&1
npm install grapheme-conformance@latest grapheme-splitter@1.0.4 graphemer@1.4.0 runes2@1.1.4 unicode-segmenter@0.17.3 >/dev/null 2>&1
cat > verify.mjs <<'JS'
import { score, vectors } from 'grapheme-conformance';
import { splitGraphemes } from 'unicode-segmenter/grapheme';
import graphemerModule from 'graphemer';
import GraphemeSplitter from 'grapheme-splitter';
import { runes } from 'runes2';

const Graphemer = graphemerModule.default ?? graphemerModule;
const intl = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemer = new Graphemer();
const splitter = new GraphemeSplitter();

const impls = {
  'Intl.Segmenter': (s) => [...intl.segment(s)].map((p) => p.segment),
  'unicode-segmenter': (s) => [...splitGraphemes(s)],
  graphemer: (s) => graphemer.splitGraphemes(s),
  'grapheme-splitter': (s) => splitter.splitGraphemes(s),
  runes2: (s) => runes(s),
};

for (const version of ['15.1.0', '16.0.0']) {
  const vecs = vectors[version];
  const row = Object.entries(impls)
    .map(([name, fn]) => `${name}=${score(fn, vecs).passed}`)
    .join(' ');
  console.log(`${version}: ${row}`);
}
JS
node verify.mjs
```

Expected output:

```text
15.1.0: Intl.Segmenter=1186 unicode-segmenter=1186 graphemer=1180 grapheme-splitter=1175 runes2=730
16.0.0: Intl.Segmenter=1092 unicode-segmenter=1092 graphemer=1086 grapheme-splitter=1081 runes2=695
```

## One caveat, and it is the only one

`Intl.Segmenter` is not a fixed library. It is scored against whatever ICU the
host Node ships, so its row moves with the runtime. Measured across the CI
matrix:

| runtime | 15.1.0 | 16.0.0 | `2701 200D 2701` |
|---|---|---|---|
| Node 22.22.2 (ICU 78.2) | 1186 | 1092 | split, the known deviation |
| Node 20.x | 1186 | 1092 | split |
| Node 18.20.8 | 1187 | 1093 | not split |

Run the command above on Node 22 or 20 to get the expected output above. On
Node 18 the `Intl.Segmenter` value reads `1187` and `1093` instead: that ICU
predates the deviation and passes every case. The other four values are
pinned to exact library versions and hold identically on every Node.

The baseline was verified on Node 22.22.2 (ICU 78.2, Unicode 17.0).

## Reproducing SCOREBOARD.md and the rest of the gates

The committed `SCOREBOARD.md` (all four vendored Unicode versions, not just
the two above) is generated from this repository's own scripts, which are not
part of the published package, so reproducing it requires a checkout:

```bash
git clone https://github.com/tamerkalla/grapheme-conformance.git && cd grapheme-conformance
npm ci
npm run scoreboard          # regenerates SCOREBOARD.md and prints it
npm run scoreboard:check    # asserts it is byte-identical to a fresh run
npm run typecheck
npm test                    # includes all ten integers above
npm run build
node scripts/smoke.mjs      # loads the ESM and CJS entry points
```

No network access is required by any of these. The vectors are committed
under `vectors/` and are never fetched.

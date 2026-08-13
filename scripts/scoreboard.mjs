// Generates SCOREBOARD.md and prints the same table to stdout.
//
// Byte-reproducible: every value in the file is derived from the vendored
// vectors, the pinned dependency versions and the host's Unicode data. The one
// clock-dependent value, the generation date, can be pinned with
// SOURCE_DATE_EPOCH so a regeneration can be diffed against the committed file.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { score, vectors } from '../dist/index.js';
import { segmenters } from './segmenters.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSIONS = Object.keys(vectors).sort((a, b) =>
  a.localeCompare(b, 'en', { numeric: true }),
);

function generationDate() {
  const epoch = process.env.SOURCE_DATE_EPOCH;
  const date = epoch ? new Date(Number(epoch) * 1000) : new Date();
  return date.toISOString().slice(0, 10);
}

/** The Unicode version backing Intl.Segmenter on this host. */
function icuUnicode() {
  return process.versions.unicode ? `Unicode ${process.versions.unicode}` : 'unknown Unicode';
}

export function renderScoreboard(date = generationDate()) {
  const rows = segmenters.map((s) => ({
    label: s.label,
    version: s.id === 'intl-segmenter' ? `ICU, ${icuUnicode()}` : s.version,
    cells: VERSIONS.map((v) => {
      const report = score(s.segment, vectors[v]);
      return `${report.passed}/${report.total} (${(report.rate * 100).toFixed(2)}%)`;
    }),
  }));

  const header = `| implementation | ${VERSIONS.map(
    (v) => `${v} (${vectors[v].length})`,
  ).join(' | ')} |`;
  const divider = `|---|${VERSIONS.map(() => '---').join('|')}|`;
  const body = rows.map((r) => `| \`${r.label}\` | ${r.cells.join(' | ')} |`);

  const versionTable = [
    '| implementation | version |',
    '|---|---|',
    ...rows.map((r) => `| \`${r.label}\` | ${r.version} |`),
  ];

  return [
    '# Scoreboard',
    '',
    "Cases passed against Unicode's official `GraphemeBreakTest.txt`, by Unicode",
    'version. Case counts are in the column headers.',
    '',
    header,
    divider,
    ...body,
    '',
    'These are counts, not grades. A lower number means a library disagrees with',
    'the answer key more often; what that costs you depends on the text you handle.',
    '',
    '---',
    '',
    `Generated ${date} by \`npm run scoreboard\`. Versions under test:`,
    '',
    ...versionTable,
    '',
    '`Intl.Segmenter` is scored against whatever ICU the host Node ships, so its',
    'row moves with the runtime; the pure-JS libraries do not.',
    '',
  ].join('\n');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const markdown = renderScoreboard();
  writeFileSync(join(ROOT, 'SCOREBOARD.md'), markdown);
  process.stdout.write(markdown);
}

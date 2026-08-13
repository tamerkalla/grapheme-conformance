// Asserts SCOREBOARD.md is byte-identical to a fresh regeneration.
//
// The committed file's own generation date is pinned into the regeneration, so
// this compares every derived value without the wall clock making it flaky.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderScoreboard } from './scoreboard.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const committed = readFileSync(join(ROOT, 'SCOREBOARD.md'), 'utf8');

const date = committed.match(/^Generated (\d{4}-\d{2}-\d{2}) by/m)?.[1];
if (!date) {
  console.error('SCOREBOARD.md has no "Generated <YYYY-MM-DD> by" footer line.');
  process.exit(1);
}

const regenerated = renderScoreboard(date);
if (regenerated !== committed) {
  console.error('SCOREBOARD.md is stale. Run `npm run scoreboard` and commit the result.');
  const a = committed.split('\n');
  const b = regenerated.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) console.error(`  line ${i + 1}:\n    committed: ${a[i]}\n    fresh:     ${b[i]}`);
  }
  process.exit(1);
}

console.log(`SCOREBOARD.md is byte-identical to a fresh run (generated ${date}).`);

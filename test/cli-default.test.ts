import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { vectors } from '../src/index';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Newest vendored key, by numeric version order rather than string order. */
function newestVendored(): string {
  return Object.keys(vectors).sort((a, b) =>
    a.localeCompare(b, 'en', { numeric: true }),
  )[Object.keys(vectors).length - 1];
}

/**
 * The CLI once defaulted to 16.0.0 while 17.0.0 was vendored. Unicode 17.0
 * removed U+2701 from Extended_Pictographic, so a default run scored a
 * current segmenter against a superseded answer key and reported a failure
 * that was not one. That produced a false bug report on someone else's
 * repository, so the default is pinned to the newest key by test.
 */
describe('CLI default version', () => {
  it('is the newest vendored key, not a hardcoded older one', () => {
    const src = readFileSync(new URL('../src/cli.ts', import.meta.url), 'utf8');
    const literal = src.match(/args\.version \?\? '([\d.]+)'/)?.[1];
    expect(literal).toBeDefined();
    expect(literal).toBe(newestVendored());
  });

  it('scores against that key when --version is omitted', () => {
    const run = spawnSync(
      process.execPath,
      ['dist/cli.js', '--module', 'unicode-segmenter/grapheme', '--export', 'splitGraphemes'],
      { cwd: ROOT, encoding: 'utf8' },
    );
    expect(run.stdout).toContain(`GraphemeBreakTest ${newestVendored()}`);
    // A conformant segmenter must exit 0 on the key it targets.
    expect(run.status).toBe(0);
  });
});

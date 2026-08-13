import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseBreakTest } from './parse.js';
import type { Vector } from './types.js';

/** The Unicode versions vendored into `vectors/`. */
const VERSIONS = ['15.0.0', '15.1.0', '16.0.0', '17.0.0'] as const;

/**
 * Locate the vendored `vectors/` directory.
 *
 * It sits one level above this module both in source (`src/`) and in the
 * published build (`dist/`); the walk up is belt and braces for bundlers that
 * nest output deeper.
 */
function vectorsDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 4; i++) {
    const candidate = join(dir, 'vectors');
    if (existsSync(join(candidate, 'GraphemeBreakTest-15.1.0.txt'))) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    'grapheme-conformance: vendored vectors/ directory not found next to the package',
  );
}

function load(): Record<string, Vector[]> {
  const dir = vectorsDir();
  const out: Record<string, Vector[]> = Object.create(null);
  for (const version of VERSIONS) {
    const source = readFileSync(join(dir, `GraphemeBreakTest-${version}.txt`), 'utf8');
    out[version] = parseBreakTest(source);
  }
  return out;
}

/**
 * The vendored official test vectors, keyed by Unicode version.
 *
 * Read from the committed `.txt` files at import time. Nothing is fetched, at
 * build time or any other time.
 */
export const vectors: Record<string, Vector[]> = load();

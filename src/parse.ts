import type { Vector } from './types.js';

const BREAK = '÷'; // ÷
const NO_BREAK = '×'; // ×

/**
 * Parse the text of a Unicode `GraphemeBreakTest.txt` into vectors.
 *
 * Pure: takes a string, touches no filesystem, no network.
 *
 * ```
 * ÷ 0915 × 094D × 0937 ÷ 093F ÷  # comment
 * ```
 *
 * `÷` means break, `×` means no break, hex code points sit between them and
 * `#` starts a comment. Lines that are blank, or whose first token is not `÷`,
 * are skipped.
 */
export function parseBreakTest(source: string): Vector[] {
  const vectors: Vector[] = [];
  const lines = source.split(/\r\n|\r|\n/);

  for (let i = 0; i < lines.length; i++) {
    const hash = lines[i].indexOf('#');
    const body = (hash === -1 ? lines[i] : lines[i].slice(0, hash)).trim();
    if (body === '') continue;

    const tokens = body.split(/\s+/);
    if (tokens[0] !== BREAK) continue;

    const expected: string[] = [];
    let cluster = '';
    let malformed = false;

    for (const token of tokens) {
      if (token === BREAK) {
        if (cluster !== '') expected.push(cluster);
        cluster = '';
      } else if (token === NO_BREAK) {
        continue;
      } else if (/^[0-9A-Fa-f]+$/.test(token)) {
        cluster += String.fromCodePoint(parseInt(token, 16));
      } else {
        malformed = true;
        break;
      }
    }
    if (malformed) continue;
    if (cluster !== '') expected.push(cluster);
    if (expected.length === 0) continue;

    vectors.push({ input: expected.join(''), expected, line: i + 1 });
  }

  return vectors;
}

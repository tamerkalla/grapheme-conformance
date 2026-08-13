import { inferRule } from './rules.js';
import type { Failure, Report, Segmenter, Vector } from './types.js';

/** Space-separated UPPERCASE hex code points. */
export function toHex(input: string): string {
  return [...input]
    .map((cp) => cp.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0'))
    .join(' ');
}

function sameClusters(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Run `segmenter` over every vector and report what it got wrong.
 *
 * Never throws. A segmenter that throws on an input, or returns anything that
 * is not an array of strings, yields a failure with `actual: []`.
 *
 * `failures` is ordered by `line`, and repeated calls on the same inputs
 * produce deeply equal reports.
 */
export function score(segmenter: Segmenter, vectors: Vector[]): Report {
  const failures: Failure[] = [];
  let passed = 0;

  for (const vector of vectors) {
    let actual: string[];
    try {
      const result = segmenter(vector.input);
      actual =
        Array.isArray(result) && result.every((c) => typeof c === 'string')
          ? [...result]
          : [];
    } catch {
      actual = [];
    }

    if (sameClusters(actual, vector.expected)) {
      passed++;
    } else {
      failures.push({
        line: vector.line,
        input: vector.input,
        inputHex: toHex(vector.input),
        expected: [...vector.expected],
        actual,
        rule: inferRule(vector.input),
      });
    }
  }

  const total = vectors.length;
  return { passed, total, rate: total === 0 ? 1 : passed / total, failures };
}

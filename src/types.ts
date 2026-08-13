/**
 * A function that splits a string into user-perceived characters.
 *
 * Both `Intl.Segmenter` wrappers and library calls fit this shape:
 *
 * ```ts
 * const seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
 * const segmenter: Segmenter = (s) => [...seg.segment(s)].map((x) => x.segment);
 * ```
 */
export type Segmenter = (input: string) => string[];

/** One case from `GraphemeBreakTest.txt`. */
export interface Vector {
  /** The full input string, all clusters concatenated. */
  input: string;
  /** The clusters the input must split into. */
  expected: string[];
  /** 1-based line number in the source `.txt`. */
  line: number;
}

/** A single case a segmenter got wrong. */
export interface Failure {
  /** 1-based line number in the source `.txt`. */
  line: number;
  input: string;
  /** Space-separated UPPERCASE hex code points, e.g. `'0915 094D 0937'`. */
  inputHex: string;
  expected: string[];
  /** What the segmenter returned. `[]` if it threw. */
  actual: string[];
  /** Inferred rule id, or `null` when no rule matched. */
  rule: string | null;
}

/** The result of scoring one segmenter against one set of vectors. */
export interface Report {
  passed: number;
  total: number;
  /** `passed / total`, or `1` when there are no vectors. */
  rate: number;
  /** Every failing case, ordered by `line`. */
  failures: Failure[];
}

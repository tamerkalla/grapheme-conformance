import { describe, expect, it } from 'vitest';

import { score, vectors } from '../src/index';
import type { Segmenter } from '../src/index';

const cases = vectors['15.1.0'];

describe('score', () => {
  it('does not throw when the segmenter throws on every input', () => {
    const boom: Segmenter = () => {
      throw new Error('nope');
    };

    const report = score(boom, cases);

    expect(report.passed).toBe(0);
    expect(report.rate).toBe(0);
    expect(report.failures.length).toBe(report.total);
    expect(report.failures.every((f) => f.actual.length === 0)).toBe(true);
  });

  it('records actual: [] for the single input a segmenter throws on', () => {
    const target = cases[5];
    const flaky: Segmenter = (input) => {
      if (input === target.input) throw new Error('nope');
      return [...input];
    };

    const failure = score(flaky, [target]).failures[0];
    expect(failure.actual).toEqual([]);
    expect(failure.line).toBe(target.line);
  });

  it('treats a segmenter returning a non-array as a failure, not a crash', () => {
    const bogus = (() => 'not an array') as unknown as Segmenter;
    expect(() => score(bogus, cases)).not.toThrow();
    expect(score(bogus, cases).passed).toBe(0);
  });

  it('scores a perfect segmenter as 1.0 with no failures', () => {
    const oracle: Segmenter = (input) =>
      cases.find((v) => v.input === input)?.expected ?? [input];

    const report = score(oracle, cases);
    expect(report.passed).toBe(report.total);
    expect(report.rate).toBe(1);
    expect(report.failures).toEqual([]);
  });

  it('is deterministic across repeated calls', () => {
    const codeUnits: Segmenter = (input) => [...input];
    expect(score(codeUnits, cases)).toEqual(score(codeUnits, cases));
  });

  it('orders failures by line', () => {
    const lines = score((input) => [...input], cases).failures.map((f) => f.line);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
  });

  it('reports inputHex as space-separated uppercase code points', () => {
    const report = score(() => [], [{ input: 'क्षि', expected: ['क्षि'], line: 1 }]);
    expect(report.failures[0].inputHex).toBe('0915 094D 0937 093F');
  });

  it('pads hex to at least four digits and does not split astral code points', () => {
    const report = score(() => [], [{ input: 'A\u{1F1FA}', expected: ['A', '\u{1F1FA}'], line: 1 }]);
    expect(report.failures[0].inputHex).toBe('0041 1F1FA');
  });

  it('rates an empty vector list as 1 without dividing by zero', () => {
    expect(score((s) => [s], [])).toEqual({ passed: 0, total: 0, rate: 1, failures: [] });
  });
});

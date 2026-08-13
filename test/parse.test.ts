import { describe, expect, it } from 'vitest';

import { parseBreakTest } from '../src/index';
import type { Vector } from '../src/index';

describe('parseBreakTest', () => {
  it('parses a hand-written fixture exactly', () => {
    // 1 comment, 2 blank, 3 breaks, 4 no-breaks, 5 starts with x, 6 mixed.
    const fixture = [
      '# GraphemeBreakTest-fixture.txt',
      '',
      '÷ 0020 ÷ 0020 ÷\t#  two spaces, two clusters',
      '÷ 0061 × 0301 ÷  # a + combining acute, one cluster',
      '× 0020 ÷ 0020 ÷  # first token is x: skipped',
      '÷ 0915 × 094D × 0937 × 093F ÷  # ksi, one cluster',
    ].join('\n');

    const expected: Vector[] = [
      { input: '  ', expected: [' ', ' '], line: 3 },
      { input: 'á', expected: ['á'], line: 4 },
      {
        input: 'क्षि',
        expected: ['क्षि'],
        line: 6,
      },
    ];

    expect(parseBreakTest(fixture)).toEqual(expected);
  });

  it('strips comments without losing the case on the line', () => {
    expect(parseBreakTest('÷ 0041 ÷ # ÷ 0042 ÷')).toEqual([
      { input: 'A', expected: ['A'], line: 1 },
    ]);
  });

  it('skips blank lines, comment-only lines and lines that do not start with a break', () => {
    expect(parseBreakTest('')).toEqual([]);
    expect(parseBreakTest('\n\n   \n')).toEqual([]);
    expect(parseBreakTest('# just a comment')).toEqual([]);
    expect(parseBreakTest('× 0020 ÷ 0020 ÷')).toEqual([]);
  });

  it('keeps 1-based line numbers across skipped lines', () => {
    const source = ['#', '', '× 0041 ÷', '', '÷ 0042 ÷'].join('\n');
    expect(parseBreakTest(source).map((v) => v.line)).toEqual([5]);
  });

  it('handles astral code points and CRLF input', () => {
    const source = '÷ 1F1FA × 1F1F8 ÷\r\n÷ 0041 ÷\r\n';
    expect(parseBreakTest(source)).toEqual([
      { input: '\u{1F1FA}\u{1F1F8}', expected: ['\u{1F1FA}\u{1F1F8}'], line: 1 },
      { input: 'A', expected: ['A'], line: 2 },
    ]);
  });

  it('does not touch the filesystem', () => {
    // A string in, vectors out. No path is ever consulted.
    expect(parseBreakTest('÷ 0041 ÷')).toHaveLength(1);
  });
});

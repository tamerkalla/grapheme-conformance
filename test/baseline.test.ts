import { describe, expect, it } from 'vitest';

import { score, vectors } from '../src/index';
import { segmenterById, segmenters } from '../scripts/segmenters.mjs';

/**
 * `Intl.Segmenter` is scored by whatever ICU the host Node ships, so its
 * numbers are only the specified ones once ICU implements Unicode 15.1 (the
 * release that added GB9c). Node 18 and 20 ship older ICU; the pure-JS
 * libraries below are pinned and assert unconditionally on every Node.
 */
const icuUnicode = Number.parseFloat(process.versions.unicode ?? '0');
const icuIsModern = Number.isFinite(icuUnicode) && icuUnicode >= 15.1;

/** The verified baseline. See README §2. */
const BASELINE: Record<string, Record<string, number>> = {
  '15.1.0': {
    'intl-segmenter': 1186,
    'unicode-segmenter': 1186,
    graphemer: 1180,
    'grapheme-splitter': 1175,
    runes2: 730,
  },
  '16.0.0': {
    'intl-segmenter': 1092,
    'unicode-segmenter': 1092,
    graphemer: 1086,
    'grapheme-splitter': 1081,
    runes2: 695,
  },
};

const TOTALS: Record<string, number> = { '15.1.0': 1187, '16.0.0': 1093 };

describe('baseline lock', () => {
  for (const [version, row] of Object.entries(BASELINE)) {
    describe(`GraphemeBreakTest ${version}`, () => {
      it(`has exactly ${TOTALS[version]} cases`, () => {
        expect(vectors[version].length).toBe(TOTALS[version]);
      });

      for (const [id, passed] of Object.entries(row)) {
        const isIntl = id === 'intl-segmenter';
        it.skipIf(isIntl && !icuIsModern)(`${id} passes exactly ${passed}`, () => {
          const report = score(segmenterById(id).segment, vectors[version]);
          expect(report.passed).toBe(passed);
          expect(report.total).toBe(TOTALS[version]);
          expect(report.failures.length).toBe(TOTALS[version] - passed);
        });
      }
    });
  }
});

describe('ICU signature', () => {
  it.skipIf(!icuIsModern)('Intl.Segmenter fails exactly one 15.1.0 case: 2701 200D 2701', () => {
    const report = score(segmenterById('intl-segmenter').segment, vectors['15.1.0']);
    expect(report.failures).toHaveLength(1);
    expect(report.failures[0].inputHex).toBe('2701 200D 2701');
  });
});

describe('rule inference', () => {
  it('names GB9c for all 7 graphemer failures at 15.1.0', () => {
    const report = score(segmenterById('graphemer').segment, vectors['15.1.0']);
    expect(report.failures).toHaveLength(7);
    expect(report.failures.map((f) => f.rule)).toEqual(Array(7).fill('GB9c'));
  });

  it('names GB11 for a ZWJ sequence between pictographs', () => {
    // 1F469 200D 1F4BB. Note U+2701, the ICU deviation case, is not
    // Extended_Pictographic, so that input infers no rule at all.
    const zwj = '\u{1F469}‍\u{1F4BB}';
    const report = score(() => [], [{ input: zwj, expected: [zwj], line: 1 }]);
    expect(report.failures[0].rule).toBe('GB11');
  });

  it('names GB12/GB13 for a pair of regional indicators', () => {
    const flag = '\u{1F1FA}\u{1F1F8}';
    const report = score(() => [], [{ input: flag, expected: [flag], line: 1 }]);
    expect(report.failures[0].rule).toBe('GB12/GB13');
  });

  it('names GB6/GB7/GB8 for Hangul jamo', () => {
    const han = '한';
    const report = score(() => [], [{ input: han, expected: [han], line: 1 }]);
    expect(report.failures[0].rule).toBe('GB6/GB7/GB8');
  });

  it('returns null when no implemented rule matches', () => {
    const report = score(() => [], [{ input: 'ab', expected: ['a', 'b'], line: 1 }]);
    expect(report.failures[0].rule).toBeNull();
  });
});

/**
 * The everyday panel. Every input here is one user-perceived character, so
 * every implementation should return exactly one cluster; the numbers above 1
 * are the measured failures.
 */
const PANEL: { name: string; input: string; counts: Record<string, number> }[] = [
  {
    name: 'क्षि Devanagari (0915 094D 0937 093F)',
    input: 'क्षि',
    counts: { graphemer: 2, 'grapheme-splitter': 2, runes2: 3 },
  },
  {
    name: 'e + combining acute (0065 0301)',
    input: 'é',
    counts: { runes2: 2 },
  },
  {
    name: 'Hangul 한 (1112 1161 11AB)',
    input: '한',
    counts: { runes2: 2 },
  },
  {
    name: 'pirate flag (1F3F4 200D 2620 FE0F)',
    input: '\u{1F3F4}‍☠️',
    counts: { 'grapheme-splitter': 2 },
  },
  { name: 'family (1F468 200D 1F469 200D 1F467 200D 1F466)', input: '\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}', counts: {} },
  { name: 'skin tone modifier (1F44D 1F3FD)', input: '\u{1F44D}\u{1F3FD}', counts: {} },
  { name: 'regional indicator flag (1F1FA 1F1F8)', input: '\u{1F1FA}\u{1F1F8}', counts: {} },
  {
    name: 'tag sequence flag (1F3F4 E0067 E0062 E0073 E0063 E0074 E007F)',
    input: '\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}',
    counts: {},
  },
  { name: 'ZWJ profession (1F469 200D 1F4BB)', input: '\u{1F469}‍\u{1F4BB}', counts: {} },
  { name: 'keycap (0031 FE0F 20E3)', input: '1️⃣', counts: {} },
];

const hexOf = (s: string) =>
  [...s].map((c) => c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')).join(' ');

describe('everyday panel', () => {
  it.each(PANEL)('$name is the code point sequence it claims to be', ({ name, input }) => {
    // Guards against a precomposed character sneaking into a decomposed case.
    const claimed = name.match(/\(([0-9A-F ]+)\)$/)?.[1];
    expect(claimed).toBeDefined();
    expect(hexOf(input)).toBe(claimed);
  });

  for (const { name, input, counts } of PANEL) {
    for (const { id, segment } of segmenters) {
      const expected = counts[id] ?? 1;
      const isIntl = id === 'intl-segmenter';
      it.skipIf(isIntl && !icuIsModern)(`${name}: ${id} yields ${expected}`, () => {
        expect(segment(input)).toHaveLength(expected);
      });
    }
  }
});

import { describe, expect, it } from 'vitest';

import { vectors } from '../src/index';

const VERSIONS = ['15.0.0', '15.1.0', '16.0.0', '17.0.0'];

describe('vendored vectors', () => {
  it('vendors exactly the four specified Unicode versions', () => {
    expect(Object.keys(vectors).sort()).toEqual([...VERSIONS].sort());
  });

  it.each(VERSIONS)('%s is self-consistent: expected.join("") === input', (version) => {
    const cases = vectors[version];
    expect(cases.length).toBeGreaterThan(0);
    for (const vector of cases) {
      expect(vector.expected.join('')).toBe(vector.input);
    }
  });

  it.each(VERSIONS)('%s has strictly increasing line numbers', (version) => {
    const lines = vectors[version].map((v) => v.line);
    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('parses 15.1.0 to exactly 1187 cases', () => {
    expect(vectors['15.1.0'].length).toBe(1187);
  });

  it('parses 16.0.0 to exactly 1093 cases', () => {
    expect(vectors['16.0.0'].length).toBe(1093);
  });
});

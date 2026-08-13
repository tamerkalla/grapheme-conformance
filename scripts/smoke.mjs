// Loads both published entry points and scores Intl.Segmenter through each.
// Catches packaging faults the test suite cannot see: bad exports map, a CJS
// build that cannot resolve vectors/, missing type entry points.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

import * as esm from '../dist/index.js';

const require = createRequire(import.meta.url);
const cjs = require('../dist/index.cjs');

const intl = new Intl.Segmenter('en', { granularity: 'grapheme' });
const segment = (s) => [...intl.segment(s)].map((part) => part.segment);

for (const [flavor, mod] of [
  ['esm', esm],
  ['cjs', cjs],
]) {
  for (const name of ['parseBreakTest', 'score', 'vectors']) {
    assert.ok(mod[name], `${flavor}: missing export ${name}`);
  }

  // Written as escapes: 'a' + U+0301 must not be confused with precomposed U+00E1.
  const acute = 'á';
  const parsed = mod.parseBreakTest('÷ 0061 × 0301 ÷ 0062 ÷');
  assert.deepEqual(parsed, [{ input: `${acute}b`, expected: [acute, 'b'], line: 1 }]);

  const versions = Object.keys(mod.vectors);
  assert.deepEqual(versions.sort(), ['15.0.0', '15.1.0', '16.0.0', '17.0.0']);
  assert.equal(mod.vectors['15.1.0'].length, 1187);

  const report = mod.score(segment, mod.vectors['16.0.0']);
  assert.equal(report.total, 1093);
  assert.ok(report.passed > 1000, `${flavor}: implausible pass count ${report.passed}`);
  assert.equal(report.passed + report.failures.length, report.total);

  const thrower = mod.score(() => {
    throw new Error('nope');
  }, mod.vectors['15.1.0']);
  assert.equal(thrower.passed, 0);

  console.log(
    `${flavor}: ok  Intl.Segmenter ${report.passed}/${report.total} on 16.0.0`,
  );
}

console.log('smoke: both entry points load and score.');

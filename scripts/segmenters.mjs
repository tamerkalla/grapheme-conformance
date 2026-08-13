// The panel under test. Shared by the test suite and the scoreboard generator
// so both score exactly the same functions at exactly the same versions.
import { createRequire } from 'node:module';

import { splitGraphemes } from 'unicode-segmenter/grapheme';
import graphemerModule from 'graphemer';
import GraphemeSplitter from 'grapheme-splitter';
import { runes } from 'runes2';

const require = createRequire(import.meta.url);

// graphemer is CJS transpiled from TS: the class sits behind a nested default.
const Graphemer = graphemerModule.default ?? graphemerModule;

const intl = new Intl.Segmenter('en', { granularity: 'grapheme' });
const graphemer = new Graphemer();
const splitter = new GraphemeSplitter();

function installed(name) {
  return require(`${name}/package.json`).version;
}

/**
 * @type {{ id: string, label: string, version: string, segment: (s: string) => string[] }[]}
 */
export const segmenters = [
  {
    id: 'intl-segmenter',
    label: 'Intl.Segmenter',
    version: `ICU via Node ${process.versions.node}`,
    segment: (s) => [...intl.segment(s)].map((part) => part.segment),
  },
  {
    id: 'unicode-segmenter',
    label: 'unicode-segmenter',
    version: installed('unicode-segmenter'),
    // splitGraphemes is a generator, not an array.
    segment: (s) => [...splitGraphemes(s)],
  },
  {
    id: 'graphemer',
    label: 'graphemer',
    version: installed('graphemer'),
    segment: (s) => graphemer.splitGraphemes(s),
  },
  {
    id: 'grapheme-splitter',
    label: 'grapheme-splitter',
    version: installed('grapheme-splitter'),
    segment: (s) => splitter.splitGraphemes(s),
  },
  {
    id: 'runes2',
    label: 'runes2',
    version: installed('runes2'),
    segment: (s) => runes(s),
  },
];

/** @param {string} id */
export function segmenterById(id) {
  const found = segmenters.find((s) => s.id === id);
  if (!found) throw new Error(`unknown segmenter: ${id}`);
  return found;
}

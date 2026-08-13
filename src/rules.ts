/**
 * Rule inference.
 *
 * This is a convenience for reading the scoreboard: it names a plausible
 * culprit for a failing case. It is not a correctness claim, and it implements
 * only the four rule groups below. Anything else returns `null`.
 */

/** Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada, Malayalam. */
const VIRAMA = /[्্੍્୍்్್്]/;

/** The nine scripts those viramas belong to. */
const INDIC_SCRIPT =
  /[\p{Script=Devanagari}\p{Script=Bengali}\p{Script=Gurmukhi}\p{Script=Gujarati}\p{Script=Oriya}\p{Script=Tamil}\p{Script=Telugu}\p{Script=Kannada}\p{Script=Malayalam}]/u;

const LETTER = /\p{L}/u;
const MARK = /\p{M}/u;
const EXT_PICT = /\p{Extended_Pictographic}/u;
const ZWJ = '‍';

function isRegionalIndicator(cp: string): boolean {
  const c = cp.codePointAt(0)!;
  return c >= 0x1f1e6 && c <= 0x1f1ff;
}

function isHangulJamo(cp: string): boolean {
  const c = cp.codePointAt(0)!;
  return (
    (c >= 0x1100 && c <= 0x11ff) ||
    (c >= 0xa960 && c <= 0xa97f) ||
    (c >= 0xd7b0 && c <= 0xd7ff)
  );
}

/**
 * A virama followed by an Indic consonant letter.
 *
 * Intervening ZWJ and combining marks are stepped over: the official vectors
 * include conjuncts such as `0915 094D 200D 0924`, where a ZWJ sits between
 * the virama and the consonant it links to.
 */
function hasIndicConjunct(cps: string[]): boolean {
  for (let i = 0; i < cps.length - 1; i++) {
    if (!VIRAMA.test(cps[i])) continue;
    let j = i + 1;
    while (j < cps.length && (cps[j] === ZWJ || MARK.test(cps[j]))) j++;
    if (j < cps.length && LETTER.test(cps[j]) && INDIC_SCRIPT.test(cps[j])) {
      return true;
    }
  }
  return false;
}

/** ZWJ with an Extended_Pictographic character on both sides. */
function hasPictographicZwj(cps: string[]): boolean {
  for (let i = 1; i < cps.length - 1; i++) {
    if (cps[i] === ZWJ && EXT_PICT.test(cps[i - 1]) && EXT_PICT.test(cps[i + 1])) {
      return true;
    }
  }
  return false;
}

/**
 * Name the rule most likely responsible for a failure on `input`, or `null`.
 *
 * Checked in order: `GB9c`, `GB11`, `GB12/GB13`, `GB6/GB7/GB8`.
 */
export function inferRule(input: string): string | null {
  const cps = [...input];

  if (hasIndicConjunct(cps)) return 'GB9c';
  if (hasPictographicZwj(cps)) return 'GB11';
  if (cps.filter(isRegionalIndicator).length >= 2) return 'GB12/GB13';
  if (cps.some(isHangulJamo)) return 'GB6/GB7/GB8';

  return null;
}

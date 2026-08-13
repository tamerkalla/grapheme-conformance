#!/usr/bin/env node
import { createRequire } from 'node:module';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { score } from './score.js';
import { vectors } from './vectors.js';
import type { Segmenter } from './types.js';

const USAGE = `Usage: grapheme-conformance --module <specifier> [options]
  --module  <specifier>  module to load (bare name, or path relative to cwd)
  --export  <name>       export to score                  (default: default)
  --version <x.y.z>      vendored vectors: ${Object.keys(vectors).join(', ')}
  --min     <0..1>       minimum pass rate                (default: 1.0)
  --limit   <n>          failing cases to print           (default: 10)
Exits non-zero when the pass rate is below --min.`;

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') return { help: 'true' };
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq !== -1) out[arg.slice(2, eq)] = arg.slice(eq + 1);
    else out[arg.slice(2)] = argv[++i] ?? '';
  }
  return out;
}

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

async function load(specifier: string, exportName: string): Promise<Segmenter> {
  const relative = specifier.startsWith('.') || isAbsolute(specifier);
  const target = relative ? pathToFileURL(resolve(process.cwd(), specifier)).href : specifier;
  let module: Record<string, unknown>;
  try {
    module = (await import(target)) as Record<string, unknown>;
  } catch {
    // Bare specifiers must resolve against the caller's node_modules, not ours.
    const from = createRequire(resolve(process.cwd(), 'noop.js'));
    module = (await import(pathToFileURL(from.resolve(specifier)).href)) as Record<string, unknown>;
  }
  const direct = module[exportName];
  const nested = (module.default as Record<string, unknown> | undefined)?.[exportName];
  const picked = typeof direct === 'function' ? direct : nested;
  if (typeof picked !== 'function') fail(`No callable export '${exportName}' in '${specifier}'.`);
  return (input: string) => {
    const result = (picked as (s: string) => unknown)(input);
    if (Array.isArray(result)) return result as string[];
    // Generators and other iterables are fine; anything else is a failure.
    if (result && typeof (result as Iterable<string>)[Symbol.iterator] === 'function') {
      return [...(result as Iterable<string>)];
    }
    throw new TypeError('segmenter did not return an array of clusters');
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.module) {
    console.log(USAGE);
    process.exit(args.module ? 0 : 2);
  }
  const version = args.version ?? '16.0.0';
  const cases = vectors[version];
  if (!cases) fail(`Unknown version '${version}'. Have: ${Object.keys(vectors).join(', ')}`);
  const min = args.min === undefined ? 1 : Number(args.min);
  if (!Number.isFinite(min) || min < 0 || min > 1) fail('--min must be between 0 and 1.');
  const limit = args.limit === undefined ? 10 : Number(args.limit);
  const exportName = args.export ?? 'default';

  const report = score(await load(args.module, exportName), cases);
  console.log(`${args.module} (${exportName})  GraphemeBreakTest ${version}`);
  console.log(`  passed  ${report.passed}/${report.total}  ${(report.rate * 100).toFixed(2)}%`);
  console.log(`  failed  ${report.failures.length}`);

  if (report.failures.length > 0) {
    console.log(`\n  ${'line'.padEnd(6)}${'input'.padEnd(34)}${'want'.padEnd(6)}${'got'.padEnd(6)}rule`);
    for (const f of report.failures.slice(0, Math.max(0, limit))) {
      const hex = f.inputHex.length > 32 ? `${f.inputHex.slice(0, 29)}...` : f.inputHex;
      console.log(
        `  ${String(f.line).padEnd(6)}${hex.padEnd(34)}` +
          `${String(f.expected.length).padEnd(6)}${String(f.actual.length).padEnd(6)}${f.rule ?? '-'}`,
      );
    }
    if (report.failures.length > limit) console.log(`  ... and ${report.failures.length - limit} more`);
  }
  process.exit(report.rate < min ? 1 : 0);
}

main().catch((error: unknown) => fail(error instanceof Error ? error.message : String(error)));

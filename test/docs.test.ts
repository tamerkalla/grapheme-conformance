import { describe, expect, test, beforeAll, afterAll } from "vitest";
import { readFileSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

interface Example {
  lang: "sh" | "bash" | "ts";
  code: string;
  expected: string;
}

// Finds every (code block, claimed output) pair in a markdown document. The
// convention this project's docs follow: a fenced ```sh/```bash/```ts block,
// then either a bare, untagged ``` block (README's pre-existing CLI example)
// or a line reading "Output:"/"Expected output:" followed by a ```text block
// (VERIFY.md). Every fenced code block in these two files carries an explicit
// language except the output blocks, so an untagged fence is unambiguous.
// Neither captured group may itself contain a "```" line.
function extractExamples(markdown: string): Example[] {
  const withLabel =
    /```(sh|bash|ts)\n((?:(?!```)[\s\S])*?)\n```\n\n(?:Output|Expected output):\n\n```text\n((?:(?!```)[\s\S])*?)\n```/g;
  const bare = /```(sh|bash|ts)\n((?:(?!```)[\s\S])*?)\n```\n\n```\n((?:(?!```)[\s\S])*?)\n```/g;
  const examples: Example[] = [];
  for (const m of markdown.matchAll(withLabel)) {
    examples.push({ lang: m[1] as Example["lang"], code: m[2] as string, expected: m[3] as string });
  }
  for (const m of markdown.matchAll(bare)) {
    examples.push({ lang: m[1] as Example["lang"], code: m[2] as string, expected: m[3] as string });
  }
  return examples;
}

describe("README.md structure", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const hook = "**Your string splitter is probably wrong about Hindi.**";

  test("opens with the fixed hook", () => {
    expect(readme.startsWith(`# grapheme-conformance\n\n${hook}\n`)).toBe(true);
  });

  test("the badge row appears character-for-character, immediately after the hook", () => {
    const badges = [
      "[![build](https://github.com/tamerkalla/grapheme-conformance/actions/workflows/release.yml/badge.svg)](https://github.com/tamerkalla/grapheme-conformance/actions/workflows/release.yml)",
      "[![npm](https://img.shields.io/npm/v/grapheme-conformance.svg)](https://www.npmjs.com/package/grapheme-conformance)",
      "[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)",
      "[![provenance](https://img.shields.io/badge/provenance-attested-brightgreen.svg)](https://www.npmjs.com/package/grapheme-conformance)",
    ].join("\n");
    const badgeIndex = readme.indexOf(badges);
    const hookIndex = readme.indexOf(hook);
    expect(badgeIndex).toBeGreaterThan(-1);
    expect(badgeIndex).toBeGreaterThan(hookIndex);
    expect(readme.slice(hookIndex + hook.length, badgeIndex)).toBe("\n\n");
  });

  test("links to VERIFY.md and SCOREBOARD.md", () => {
    expect(readme).toMatch(/\[VERIFY\.md\]\(\.\/VERIFY\.md\)/);
    expect(readme).toMatch(/\[SCOREBOARD\.md\]\(\.\/SCOREBOARD\.md\)/);
  });
});

describe("every code example in README.md is executed and its output matches", () => {
  const readme = readFileSync(join(ROOT, "README.md"), "utf8");
  const examples = extractExamples(readme);

  test("at least one example was found", () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  for (const [i, example] of examples.entries()) {
    if (example.code.includes("npx grapheme-conformance")) {
      test(`example ${i + 1} (${example.lang}, CLI) prints the claimed output`, () => {
        // The doc invokes the published CLI via npx; the test runs the
        // locally built one instead of touching the network.
        const prepared = example.code.replace(
          /npx grapheme-conformance/g,
          `${JSON.stringify(process.execPath)} ${JSON.stringify(join(ROOT, "dist", "cli.js"))}`,
        );
        const result = spawnSync("bash", ["-c", prepared], { cwd: ROOT, encoding: "utf8" });
        expect(result.stdout.trim()).toBe(example.expected.trim());
      }, 30_000);
    } else {
      test(`example ${i + 1} (${example.lang}) prints the claimed output`, () => {
        const result = spawnSync("bash", ["-c", example.code], { cwd: ROOT, encoding: "utf8" });
        expect(result.stdout.trim()).toBe(example.expected.trim());
      }, 30_000);
    }
  }
});

describe("every code example in VERIFY.md is executed and its output matches", () => {
  const verify = readFileSync(join(ROOT, "VERIFY.md"), "utf8");
  const examples = extractExamples(verify);

  test("does not require this repository to be checked out", () => {
    expect(verify).toMatch(/does not require this repository\s+to be checked out/);
  });

  test("installs by the latest tag into a clean directory", () => {
    expect(verify).toMatch(/npm install grapheme-conformance@latest/);
    expect(verify).toMatch(/mkdir -p/);
  });

  test("at least one example was found", () => {
    expect(examples.length).toBeGreaterThan(0);
  });

  let tarballPath: string;
  let packDir: string;

  beforeAll(() => {
    packDir = mkdtempSync(join(tmpdir(), "grapheme-conformance-verify-pack-"));
    const pack = spawnSync("npm", ["pack", "--silent", "--pack-destination", packDir], {
      cwd: ROOT,
      encoding: "utf8",
    });
    expect(pack.status).toBe(0);
    const tarballName = pack.stdout.trim().split("\n").pop()!.trim();
    tarballPath = join(packDir, tarballName);
    expect(existsSync(tarballPath)).toBe(true);
  }, 120_000);

  afterAll(() => {
    rmSync(packDir, { recursive: true, force: true });
  });

  for (const [i, example] of examples.entries()) {
    if (!example.code.includes("npm install grapheme-conformance@latest")) continue;
    test(`example ${i + 1} (installed from the published tarball) reproduces the claimed output`, () => {
      const dir = mkdtempSync(join(tmpdir(), "grapheme-conformance-verify-run-"));
      try {
        // The doc installs from the registry; the test instead reproduces the
        // installed layout by copying this repo's own dependency tree
        // (already resolved by npm ci — it holds every library the script
        // needs, at the exact pinned versions) and swapping in the tarball
        // this repository just built for grapheme-conformance itself. A
        // fresh, lockfile-less `npm install` here would need the network to
        // resolve versions, and no test may reach the network.
        const replacement = [
          `cp -r ${JSON.stringify(join(ROOT, "node_modules"))} node_modules`,
          "rm -rf node_modules/grapheme-conformance",
          `tar -xzf ${JSON.stringify(tarballPath)} -C node_modules`,
          "mv node_modules/package node_modules/grapheme-conformance",
        ].join("\n");
        const prepared = example.code.replace(
          /npm init -y >\/dev\/null 2>&1\nnpm install grapheme-conformance@latest grapheme-splitter@1\.0\.4 graphemer@1\.4\.0 runes2@1\.1\.4 unicode-segmenter@0\.17\.3 >\/dev\/null 2>&1/,
          replacement,
        );
        const result = spawnSync("bash", ["-c", prepared], { cwd: dir, encoding: "utf8" });
        expect(result.stdout.trim()).toBe(example.expected.trim());
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    }, 120_000);
  }
});

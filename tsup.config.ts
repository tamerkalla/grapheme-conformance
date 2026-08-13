import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  format: ['esm', 'cjs'],
  target: 'es2022',
  platform: 'node',
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: false,
  // Rewrites import.meta.url for the CJS build so vectors/ resolves in both.
  shims: true,
  outExtension({ format }) {
    return { js: format === 'esm' ? '.js' : '.cjs' };
  },
});

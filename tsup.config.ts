import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/extension.ts'],
  sourcemap: true,
  clean: true,
  external: ['vscode'],
});

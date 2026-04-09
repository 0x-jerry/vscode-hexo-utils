import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/extension.ts'],
  format: ['cjs'],
  platform: 'node',
  sourcemap: false,
  clean: true,
  external: ['vscode'],
})

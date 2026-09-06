import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// The production build is one HTML file (dist/index.html) with all JS and CSS inlined, so GitHub Pages,
// the artifact flow and the Capacitor webDir all work from a single file.
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
    reportCompressedSize: false,
    minify: 'esbuild',
  },
  plugins: [viteSingleFile()],
});

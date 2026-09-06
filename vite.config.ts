import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The production build is one HTML file (dist/index.html) with all JS and CSS inlined, so GitHub Pages and
// the artifact flow work from a single file.
export default defineConfig({
  base: './',
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

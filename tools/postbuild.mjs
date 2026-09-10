// Validate the single-file build: one HTML file, no external module scripts, under the size budget.
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('dist/index.html');
const html = fs.readFileSync(out, 'utf8');
if (!/<canvas id="c"/.test(html)) {
  console.error('postbuild: build output does not look like the game');
  process.exit(1);
}
const local = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^https?:\/\//.test(s));
if (local.length) {
  console.error('postbuild: build is not single-file, found script src ' + local.join(', '));
  process.exit(1);
}
// The curve is published next to the page so installed apps can fetch tuning changes (docs/curve.md).
fs.copyFileSync(path.resolve('src/data/curve.json'), path.join(path.dirname(out), 'curve.json'));
fs.copyFileSync(path.resolve('src/data/events.json'), path.join(path.dirname(out), 'events.json'));
const extra = fs
  .readdirSync(path.dirname(out))
  .filter((f) => f !== 'index.html' && f !== 'curve.json' && f !== 'events.json');
if (extra.length) console.warn('postbuild: extra files in dist (not needed by the page): ' + extra.join(', '));
const bytes = Buffer.byteLength(html);
console.log(`postbuild: dist/index.html is ${(bytes / 1024).toFixed(1)} KB, single file`);
if (bytes > 5 * 1024 * 1024) {
  console.error('postbuild: build exceeds the 5 MB budget');
  process.exit(1);
}

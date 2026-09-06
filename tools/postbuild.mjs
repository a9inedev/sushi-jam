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
const extra = fs.readdirSync(path.dirname(out)).filter((f) => f !== 'index.html');
if (extra.length) console.warn('postbuild: extra files in dist (not needed by the page): ' + extra.join(', '));
const bytes = Buffer.byteLength(html);
console.log(`postbuild: dist/index.html is ${(bytes / 1024).toFixed(1)} KB, single file`);
if (bytes > 5 * 1024 * 1024) {
  console.error('postbuild: build exceeds the 5 MB budget');
  process.exit(1);
}

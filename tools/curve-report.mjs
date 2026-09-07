// Measures every level against the difficulty curve and plots measured vs target fail rate.
//   node tools/curve-report.mjs [from] [to] [--docs]
// Writes tools/out/curve-report.json, curve.md, curve.svg and curve.png (CI uploads these as the
// "curve-report" artifact). --docs also copies the SVG to docs/curve.svg.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const from = Number(args[0] || 1),
  to = Number(args[1] || 200);
const OUT = path.resolve('tools/out');
fs.mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: ['src/engine/report-entry.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'tools/out/report.mjs',
  logLevel: 'silent',
});
const m = await import(pathToFileURL(path.join(OUT, 'report.mjs')).href + '?t=' + Date.now());

// Register the authored files exactly as src/data/levels.ts does in the app.
const LV = path.resolve('levels');
const authored = new Map();
for (const f of fs.readdirSync(LV).filter((f) => f.endsWith('.json'))) {
  const j = JSON.parse(fs.readFileSync(path.join(LV, f), 'utf8'));
  authored.set(j.n, j);
}
const built = new Map();
m.registerAuthored((n) => {
  const j = authored.get(n);
  if (!j) return null;
  if (!built.has(n)) built.set(n, m.levelFromJson(j));
  return built.get(n);
});

const runs = m.curve().solver.ciRuns;
const t0 = Date.now();
const rows = [];
for (let n = from; n <= to; n++) {
  const lv = m.makeLevel(n);
  const c = m.curveFor(n);
  const diff = m.evalLevel(lv, runs);
  rows.push({
    n,
    authored: !!lv.authored,
    target: c.fail,
    band: c.band,
    measured: +diff.toFixed(3),
    inBand: diff >= c.band[0] - 1e-9 && diff <= c.band[1] + 1e-9,
    grid: `${lv.rows}x${lv.cols}`,
    colors: lv.P.colors,
    diners: lv.diners.length,
    seats: lv.P.seats,
    beltCap: lv.P.beltCap,
    visibleNext: lv.P.visibleNext,
    mechs: lv.mechs,
  });
}
const secs = ((Date.now() - t0) / 1000).toFixed(1);
const out = rows.filter((r) => !r.inBand);
const summary = {
  when: new Date().toISOString(),
  from,
  to,
  runs,
  seconds: +secs,
  levels: rows.length,
  inBand: rows.length - out.length,
  outOfBand: out.map((r) => r.n),
  meanAbsError: +(rows.reduce((s, r) => s + Math.abs(r.measured - r.target), 0) / rows.length).toFixed(4),
};
fs.writeFileSync(path.join(OUT, 'curve-report.json'), JSON.stringify({ summary, rows }, null, 2));

/* ---------- plot ---------- */
const W = 1100,
  H = 460,
  ML = 60,
  MR = 20,
  MT = 50,
  MB = 50;
const px = (n) => ML + ((n - from) / Math.max(1, to - from)) * (W - ML - MR);
const py = (v) => MT + (1 - v) * (H - MT - MB);
const fmt = (v) => (Math.round(v * 1000) / 1000).toString();
const upper = rows.map((r) => `${fmt(px(r.n))},${fmt(py(r.band[1]))}`);
const lower = rows
  .slice()
  .reverse()
  .map((r) => `${fmt(px(r.n))},${fmt(py(r.band[0]))}`);
const target = rows.map((r) => `${fmt(px(r.n))},${fmt(py(r.target))}`).join(' ');
const measured = rows.map((r) => `${fmt(px(r.n))},${fmt(py(r.measured))}`).join(' ');
const grid = [];
for (let v = 0; v <= 1.0001; v += 0.25)
  grid.push(
    `<line x1="${ML}" y1="${fmt(py(v))}" x2="${W - MR}" y2="${fmt(py(v))}" stroke="#E4DCCB"/>` +
      `<text x="${ML - 8}" y="${fmt(py(v) + 4)}" text-anchor="end" font-size="12" fill="#6B6560">${Math.round(v * 100)}%</text>`
  );
for (let n = Math.ceil(from / 10) * 10; n <= to; n += 10)
  grid.push(
    `<line x1="${fmt(px(n))}" y1="${MT}" x2="${fmt(px(n))}" y2="${H - MB}" stroke="${n % 50 === 0 ? '#D8CFBB' : '#EFE9DB'}"/>` +
      (n % 20 === 0
        ? `<text x="${fmt(px(n))}" y="${H - MB + 18}" text-anchor="middle" font-size="12" fill="#6B6560">${n}</text>`
        : '')
  );
const dots = rows
  .map(
    (r) =>
      `<circle cx="${fmt(px(r.n))}" cy="${fmt(py(r.measured))}" r="${r.authored ? 3 : 2.5}" fill="${r.inBand ? '#2FB36B' : '#E5484D'}"><title>level ${r.n}: measured ${Math.round(r.measured * 100)}%, target ${Math.round(r.target * 100)}%, band ${Math.round(r.band[0] * 100)}–${Math.round(r.band[1] * 100)}%</title></circle>`
  )
  .join('');
const authoredEnd = rows.filter((r) => r.authored).length
  ? Math.max(...rows.filter((r) => r.authored).map((r) => r.n))
  : 0;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Segoe UI, Helvetica, Arial, sans-serif">
<rect width="${W}" height="${H}" fill="#FFFDF7"/>
<text x="${ML}" y="24" font-size="16" font-weight="700" fill="#2A2320">Sushi Jam difficulty curve: measured vs target fail rate, levels ${from} to ${to} (${runs} solver runs each)</text>
<text x="${ML}" y="42" font-size="12" fill="#6B6560">${summary.inBand}/${summary.levels} in band · mean |error| ${(summary.meanAbsError * 100).toFixed(1)} pts${authoredEnd ? ` · authored through level ${authoredEnd}, generated after` : ''}</text>
${grid.join('\n')}
<polygon points="${upper.join(' ')} ${lower.join(' ')}" fill="#3E7BFA" fill-opacity="0.12"/>
${authoredEnd && authoredEnd < to ? `<line x1="${fmt(px(authoredEnd + 0.5))}" y1="${MT}" x2="${fmt(px(authoredEnd + 0.5))}" y2="${H - MB}" stroke="#8A8378" stroke-dasharray="4 4"/>` : ''}
<polyline points="${target}" fill="none" stroke="#3E7BFA" stroke-width="2"/>
<polyline points="${measured}" fill="none" stroke="#2A2320" stroke-opacity="0.35" stroke-width="1"/>
${dots}
<g font-size="12" fill="#2A2320" transform="translate(${W - MR - 330}, ${MT + 8})">
  <rect x="0" y="-4" width="14" height="12" fill="#3E7BFA" fill-opacity="0.12"/><text x="20" y="6">target band</text>
  <line x1="110" y1="2" x2="130" y2="2" stroke="#3E7BFA" stroke-width="2"/><text x="136" y="6">target</text>
  <circle cx="200" cy="2" r="3" fill="#2FB36B"/><text x="208" y="6">measured, in band</text>
  <circle cx="0" cy="22" r="3" fill="#E5484D"/><text x="8" y="26">measured, out of band</text>
</g>
</svg>
`;
fs.writeFileSync(path.join(OUT, 'curve.svg'), svg);
try {
  const sharp = (await import('sharp')).default;
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT, 'curve.png'));
} catch (e) {
  console.warn('curve-report: PNG not written (' + (e.message || e) + '); the SVG is the artifact');
}

const md = [
  `# Difficulty curve report`,
  ``,
  `Levels ${from} to ${to}, ${runs} solver runs each, ${secs} s. ${summary.inBand}/${summary.levels} in band, mean |error| ${(summary.meanAbsError * 100).toFixed(1)} points.${out.length ? ` Out of band: ${out.map((r) => r.n).join(', ')}.` : ''}`,
  ``,
  `![curve](curve.svg)`,
  ``,
  `| Level | Source | Grid | Colours | Diners | Seats | Belt | Window | Rules | Measured | Target | Band | In band |`,
  `| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ...rows.map(
    (r) =>
      `| ${r.n} | ${r.authored ? 'authored' : 'generated'} | ${r.grid} | ${r.colors} | ${r.diners} | ${r.seats} | ${r.beltCap} | ${r.visibleNext} | ${r.mechs.join(', ') || '-'} | ${Math.round(r.measured * 100)}% | ${Math.round(r.target * 100)}% | ${Math.round(r.band[0] * 100)}–${Math.round(r.band[1] * 100)}% | ${r.inBand ? 'yes' : 'NO'} |`
  ),
  ``,
];
fs.writeFileSync(path.join(OUT, 'curve.md'), md.join('\n'));
if (process.argv.includes('--docs')) fs.copyFileSync(path.join(OUT, 'curve.svg'), path.resolve('docs/curve.svg'));
console.log(
  `curve-report: ${summary.inBand}/${summary.levels} levels in band, mean |error| ${(summary.meanAbsError * 100).toFixed(1)} pts, ${secs} s` +
    (out.length
      ? `\n  out of band: ${out.map((r) => `${r.n} (${Math.round(r.measured * 100)}% vs ${Math.round(r.band[0] * 100)}–${Math.round(r.band[1] * 100)}%)`).join(', ')}`
      : '')
);

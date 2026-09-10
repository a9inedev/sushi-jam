// The lives experiment report: merges analytics exports (one JSON per device, from the dev panel's
// "Copy analytics" or the optional endpoint), prints both arms side by side, applies the registered decision
// rule and writes docs/lives-recommendation.md.
//   node tools/lives-report.mjs [dir=tools/analytics]
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// The rule and the counters live in src/meta/analytics-core.ts (import-free); bundle it so the report uses the
// same code as the game.
const OUT = path.resolve('tools/out');
fs.mkdirSync(OUT, { recursive: true });
await build({
  entryPoints: ['src/meta/analytics-core.ts'],
  bundle: true,
  format: 'esm',
  platform: 'neutral',
  outfile: 'tools/out/analytics-core.mjs',
  logLevel: 'silent',
});
const { decide, DECISION, merge, report } = await import(
  pathToFileURL(path.join(OUT, 'analytics-core.mjs')).href + '?t=' + Date.now()
);

const dir = path.resolve(process.argv[2] || 'tools/analytics');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')) : [];
const exportsList = files.map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).metrics).filter(Boolean);
const merged = merge(exportsList);
const r = report(merged);
const d = decide(r);
const today = new Date().toISOString().slice(0, 10);

const row = (label, a, b) => `| ${label} | ${a} | ${b} |`;
const table = [
  '| metric | A (no lives) | B (5 lives) |',
  '| --- | ---: | ---: |',
  row('devices', files.length, ''),
  row('sessions', r.A.sessions, r.B.sessions),
  row('days of data', r.A.days, r.B.days),
  row('average session (min)', r.A.avgSessionMin, r.B.avgSessionMin),
  row('retries per fail', r.A.retriesPerFail, r.B.retriesPerFail),
  row('ads per session', r.A.adsPerSession, r.B.adsPerSession),
  row('fails per level', r.A.failsPerLevel, r.B.failsPerLevel),
  row('out-of-lives screens', r.A.livesOut, r.B.livesOut),
].join('\n');

console.log(table.replace(/\|/g, ' '));
console.log(`decision: ${d.choice}`);
for (const s of d.reasons) console.log('  ' + s);

const status =
  d.choice === 'extend'
    ? `**Recommendation: not yet.** The data does not meet the pre-registered minimum (${d.reasons.join('; ')}). Keep both arms running.`
    : d.choice === 'B'
      ? '**Recommendation: ship variant B (5 lives, 30 minute refill).** It kept session length and retries within 10% of A and showed at least 20% more ads per session.'
      : '**Recommendation: keep variant A (no lives).** B did not clear the bar: ' + d.reasons.join('; ') + '.';

const md = `# Lives model: recommendation

Generated ${today} by \`node tools/lives-report.mjs\` from ${files.length} device export${files.length === 1 ? '' : 's'} in \`${path.relative(process.cwd(), dir)}\`.

${status}

## Numbers

${table}

Ratios B/A: session length ${d.ratios.session}, retries per fail ${d.ratios.retries}, ads per session ${d.ratios.ads}.

## The rule (registered before data)

- At least ${DECISION.minSessionsPerArm} sessions in each arm and ${DECISION.minDays} days of data, else extend.
- Ship B only if B/A session length >= ${DECISION.sessionRatioMin}, B/A retries per fail >= ${DECISION.retryRatioMin} and B/A ads per session >= ${DECISION.adsRatioMin}.
- Otherwise keep A.

See docs/lives.md for what each arm does and how the metrics are defined.
`;
fs.mkdirSync('docs', { recursive: true });
fs.writeFileSync('docs/lives-recommendation.md', md);
console.log('wrote docs/lives-recommendation.md');

// The coin economy: ledger of sources and sinks, a simulated non-payer over 200 levels, a chart and a
// one-page rationale.
//   node tools/economy.mjs            report + docs/economy.md, docs/economy.svg, docs/economy.csv
//   node tools/economy.mjs --tune     search reward base/slope for the targets (prints the best rows)
//   node tools/economy.mjs --write base slope   write that reward column into src/data/curve.json
//   node tools/economy.mjs --measured  use the last CI-measured fail rates instead of the curve targets
import fs from 'node:fs';
import path from 'node:path';
import {
  avgBoosterCost,
  checkTargets,
  dailyReward,
  DEFAULT_ASSUMPTIONS,
  ledger,
  rewardColumn,
  simulate,
  TARGETS,
  tune,
  winReward,
} from './economy-model.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const CURVE = path.join(ROOT, 'src/data/curve.json');
const PRODUCTS = path.join(ROOT, 'src/data/products.json');
const DOCS = path.join(ROOT, 'docs');
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);

const curve = JSON.parse(fs.readFileSync(CURVE, 'utf8'));
const econ = JSON.parse(fs.readFileSync(PRODUCTS, 'utf8'));
let measured = null;
const reportFile = path.join(ROOT, 'tools/out/curve-report.json');
if (fs.existsSync(reportFile)) {
  const rows = JSON.parse(fs.readFileSync(reportFile, 'utf8')).rows;
  measured = Array.from({ length: 200 }, (_, i) => rows.find((r) => r.n === i + 1)?.measured ?? null);
}

if (flag('--tune')) {
  const best = tune(curve, econ, { measured });
  console.log('base  slope  ok  lvl/booster  walls>30  walls<30  end coins');
  for (const r of best.slice(0, 15))
    console.log(
      String(r.base).padStart(4),
      r.slope.toFixed(2).padStart(6),
      r.ok ? ' ok ' : ' -- ',
      String(r.summary.levelsPerBooster).padStart(9),
      String(r.summary.wallsAfter30).padStart(9),
      String(r.summary.wallsBefore30).padStart(9),
      String(r.summary.endCoins).padStart(10)
    );
  process.exit(0);
}

if (flag('--write')) {
  const i = args.indexOf('--write');
  const base = Number(args[i + 1]),
    slope = Number(args[i + 2]);
  if (!Number.isFinite(base) || !Number.isFinite(slope)) throw new Error('--write base slope');
  const col = rewardColumn(curve.levels.length, base, slope);
  curve.levels.forEach((l, k) => (l.reward = col[k]));
  fs.writeFileSync(CURVE, JSON.stringify(curve, null, 2) + '\n');
  econ.win.base = base;
  econ.win.slope = slope;
  fs.writeFileSync(PRODUCTS, JSON.stringify(econ, null, 2) + '\n');
  console.log(
    `wrote reward = round(${base} + ${slope} n) into ${path.relative(ROOT, CURVE)} (${col[0]} .. ${col[col.length - 1]})`
  );
  process.exit(0);
}

const mode = flag('--measured') ? 'measured' : 'target';
const sim = simulate(curve, econ, { failMode: mode, measured });
const engaged = simulate(curve, econ, { failMode: mode, measured, puzzleRate: 1 });
const checks = checkTargets(sim.summary);
const s = sim.summary;

/* ---------- console ---------- */
console.log(`economy: ${s.levels} levels x ${s.runs} runs, fail rates = ${mode}`);
for (const c of checks) console.log(`  ${c.ok ? 'ok ' : 'MISS'} ${c.name}: ${c.value} (band ${c.band.join('..')})`);
console.log(
  `  income ${s.income} (${s.incomePerLevel}/level), booster ~${s.avgBoosterCost}, used ${s.boostersUsed} (${s.boostersPer3} per 3 levels)`
);
console.log(
  `  fails ${s.failsTotal}, walls ${s.wallsTotal} (after 30: ${s.wallsAfter30}, one every ${s.wallSpacingAfter30}), end coins ${s.endCoins}, p10 min ${s.minCoins}`
);

/* ---------- csv ---------- */
fs.mkdirSync(DOCS, { recursive: true });
const csv = ['n,fail,reward,coins_mean,coins_p10,coins_p90,earned,spent,fails,boosters,walls,broke']
  .concat(
    sim.perLevel.map((r) =>
      [
        r.n,
        r.fail,
        r.reward,
        r.coins,
        r.coinsP10,
        r.coinsP90,
        r.earned,
        r.spent,
        r.fails,
        r.boosters,
        r.walls,
        r.broke,
      ].join(',')
    )
  )
  .join('\n');
// The measured-rates run keeps its own files; docs/economy.md describes the target run.
const suffix = mode === 'measured' ? '-measured' : '';
fs.writeFileSync(path.join(DOCS, `economy${suffix}.csv`), csv + '\n');

/* ---------- chart ---------- */
const W = 960,
  H = 460,
  ML = 64,
  MR = 24,
  MT = 40,
  MB = 56;
const pw = W - ML - MR,
  ph = H - MT - MB;
const maxC = Math.max(1000, ...sim.perLevel.map((r) => r.coinsP90)) * 1.05;
const px = (n) => ML + ((n - 1) / (s.levels - 1)) * pw;
const py = (c) => MT + ph - (Math.max(0, c) / maxC) * ph;
const f = (v) => v.toFixed(1);
const line = sim.perLevel.map((r) => `${f(px(r.n))},${f(py(r.coins))}`).join(' ');
const band =
  sim.perLevel.map((r) => `${f(px(r.n))},${f(py(r.coinsP90))}`).join(' ') +
  ' ' +
  sim.perLevel
    .slice()
    .reverse()
    .map((r) => `${f(px(r.n))},${f(py(r.coinsP10))}`)
    .join(' ');
const walls = sim.perLevel
  .map(
    (r) =>
      `<rect x="${f(px(r.n) - 1.5)}" y="${f(MT + ph - r.walls * ph * 0.6)}" width="3" height="${f(r.walls * ph * 0.6)}" fill="#E5484D" fill-opacity="0.55"><title>level ${r.n}: wall in ${Math.round(r.walls * 100)}% of runs, fail ${Math.round(r.fail * 100)}%</title></rect>`
  )
  .join('');
const boosterLine = sim.perLevel
  .map((r) => `${f(px(r.n))},${f(MT + ph - Math.min(1, r.boosters) * ph * 0.25)}`)
  .join(' ');
const yTicks = [];
for (let c = 0; c <= maxC; c += maxC > 4000 ? 1000 : 500) yTicks.push(c);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Nunito, Segoe UI, sans-serif" font-size="12">
<rect width="${W}" height="${H}" fill="#FFF9EE"/>
<text x="${ML}" y="24" font-size="16" font-weight="700" fill="#2A2320">Sushi Jam coin economy: a non-payer over ${s.levels} levels (${s.runs} simulated players, fail rates = ${mode})</text>
${yTicks.map((c) => `<line x1="${ML}" x2="${W - MR}" y1="${f(py(c))}" y2="${f(py(c))}" stroke="#EADFC4"/><text x="${ML - 8}" y="${f(py(c) + 4)}" text-anchor="end" fill="#8A8378">${c}</text>`).join('')}
${[1, 30, 60, 90, 120, 150, 180, 200].map((n) => `<line x1="${f(px(n))}" x2="${f(px(n))}" y1="${MT}" y2="${MT + ph}" stroke="#EADFC4" stroke-dasharray="3 3"/><text x="${f(px(n))}" y="${H - MB + 18}" text-anchor="middle" fill="#8A8378">${n}</text>`).join('')}
<polygon points="${band}" fill="#3E7BFA" fill-opacity="0.12"/>
${walls}
<polyline points="${boosterLine}" fill="none" stroke="#148F82" stroke-width="1.2" stroke-opacity="0.8"/>
<polyline points="${line}" fill="none" stroke="#3E7BFA" stroke-width="2.4"/>
<text x="${ML}" y="${H - 12}" fill="#5A4E45">Blue: mean coins on hand (band p10 to p90). Green: boosters used per level (0 to 1, lower quarter). Red bars: share of players hitting a wall (ad rescue) on that level.</text>
<text x="${W - MR}" y="${H - MB + 34}" text-anchor="end" fill="#8A8378">level</text>
</svg>
`;
fs.writeFileSync(path.join(DOCS, `economy${suffix}.svg`), svg);
if (mode === 'measured') {
  console.log(`wrote docs/economy-measured.svg and .csv (${s.wallsAfter30} walls after 30 with the measured rates)`);
  process.exit(0);
}

/* ---------- rationale ---------- */
const led = ledger(curve, econ, 1);
const led100 = ledger(curve, econ, 100);
const row = (l, i) =>
  `| ${l.kind} | ${l.name} | ${l.amount}${led100[i].amount !== l.amount ? ` (level 100: ${led100[i].amount})` : ''} | ${l.per} | ${l.note} |`;
const e = engaged.summary;
const md = `# Coin economy

Generated by \`node tools/economy.mjs\` from \`src/data/curve.json\` (the \`reward\` column) and \`src/data/products.json\`
(every other number). Re-run it after touching either file; \`tests/economy.test.ts\` pins the shipped numbers to the
targets below.

![coin balance over 200 levels](economy.svg)

## Sources and sinks

| kind | name | coins | per | note |
| --- | --- | ---: | --- | --- |
${led.map(row).join('\n')}

Level reward: \`round(${econ.win.base} + ${econ.win.slope} n)\`, from ${winReward(curve, 1)} at level 1 to ${winReward(curve, 200)} at level 200, stored per level in \`curve.json\` so the remote
override can tune it without a build. Streak bonus +${econ.win.streakStep} per consecutive win, capped at +${econ.win.streakMax}. Daily bonus ${dailyReward(econ, 1)} rising to ${dailyReward(econ, econ.daily.maxDays)}.
Boosters cost ${econ.boosters.sendback} / ${econ.boosters.vip} / ${econ.boosters.takeout} coins (Send Back / VIP / Takeout), about ${Math.round(avgBoosterCost(econ))} for the mix a player reaches for.

## The simulated non-payer

- Plays ${DEFAULT_ASSUMPTIONS.levelsPerDay} levels a day, collects the daily bonus every day, does the daily puzzle half the days. No rush, zen,
  events, season or decor (all bonus income; the "engaged" row below adds the puzzle every day).
- Fails a level with the curve's target fail rate for that level (the noisy solver's rate, what the curve is
  verified against). Wants a booster on any level with a fail rate of ${Math.round(DEFAULT_ASSUMPTIONS.boosterThreshold * 100)}% or more; a booster cuts the fail rate by
  ${Math.round(DEFAULT_ASSUMPTIONS.boosterEffect * 100)}%. Reaches for Send Back half the time, VIP a third, Takeout the rest, and falls back to whatever is
  affordable. Inventory first, then coins.
- ${DEFAULT_ASSUMPTIONS.wallFails} fails in a row on a level with no booster left to buy is a **wall**: the player takes the free ad rescue.
  That is the moment a purchase (Chef's Rescue, coins) or an ad is the only way on.
- ${s.runs} players, seeded, averaged.

## Targets and results (fail rates = ${mode})

| target | value | band | |
| --- | ---: | --- | --- |
${checks.map((c) => `| ${c.name} | ${c.value} | ${c.band.join(' to ')} | ${c.ok ? 'met' : 'missed'} |`).join('\n')}

- Income ${s.income} coins over ${s.levels} levels (${s.incomePerLevel} per level); one booster (~${s.avgBoosterCost}) every ${s.levelsPerBooster} levels of income.
- Boosters used: ${s.boostersUsed} (${s.boostersPer3} per three levels). Fails: ${s.failsTotal}. Walls: ${s.wallsTotal}, of which ${s.wallsAfter30} after level 30
  (one every ${s.wallSpacingAfter30} levels) and ${s.wallsBefore30} before.
- Coins on hand end at ${s.endCoins} (10th percentile never below ${s.minCoins}). Levels where a booster was wanted but not affordable: ${s.brokeLevels}.
- Engaged player (daily puzzle every day): one booster every ${e.levelsPerBooster} levels, ${e.wallsAfter30} walls after 30.

### Fails, boosters and walls per ten levels

| levels | fails | boosters | walls |
| --- | ---: | ---: | ---: |
${sim.decades.map((d) => `| ${d.from}-${d.to} | ${d.fails} | ${d.boosters} | ${d.walls} |`).join('\n')}

## Why these numbers

- The old reward (50 + 2n, up to 450 a level) outran the sinks by level 40: a non-payer could buy a booster
  on every level and never met a wall. Boosters are the only mandatory sink, so the reward has to sit near a
  third of a booster per level for "one every three levels" to hold.
- A flat-ish reward keeps that ratio across the whole run; a small slope pays for the later levels wanting a
  booster almost every time. The daily bonus is a third of income early on, which is why the first thirty levels
  (fail rates under 20%) stay wall-free and the balance builds a cushion.
- Walls come from the curve, not from a coin shortage alone: after level 30 the fail targets sit at 30 to 60%,
  so a booster is wanted on nearly every level and the budget covers one in three. The rest is where the
  ad rescue, Chef's Rescue and the coin products earn their place, about every ${s.wallSpacingAfter30} levels.
- Booster prices stay at ${econ.boosters.sendback} / ${econ.boosters.vip} / ${econ.boosters.takeout}: the cheap Send Back is the workhorse, and the VIP seat's price makes it
  a decision rather than a reflex.
- Levels 141 to 200 have no authored files and the generator overshoots their bands (see docs/curve.md); the
  \`--measured\` run (docs/economy-measured.svg) shows what that does to walls until those levels are authored.

## Not modelled

Rush, zen, events, the season pass and decor add coins or spend them optionally; purchases are excluded by
definition. Booster effectiveness (${Math.round(DEFAULT_ASSUMPTIONS.boosterEffect * 100)}%) is an assumption to replace with telemetry once real
players exist; the model file has it as one number.
`;
fs.writeFileSync(path.join(DOCS, 'economy.md'), md);
console.log('wrote docs/economy.md, docs/economy.svg, docs/economy.csv');
if (flag('--strict') && !checks.every((c) => c.ok)) process.exit(1);
export { TARGETS };

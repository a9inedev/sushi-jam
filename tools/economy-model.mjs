// The coin economy as a model: every source and sink the game has, and a non-payer simulated through the
// levels with the curve's fail rates. Pure and seeded, so tests can pin the shipped numbers to the targets.
// Used by tools/economy.mjs (report, chart, tuning) and tests/economy.test.ts.

/* ---------- numbers the game reads ---------- */

/** Coins for winning level n: the curve's reward column, or the legacy formula when a row lacks it. */
export function winReward(curve, n) {
  const row = curve.levels[Math.min(curve.levels.length, Math.max(1, n)) - 1];
  return row && typeof row.reward === 'number' ? row.reward : 50 + n * 2;
}

export function streakBonus(econ, streak) {
  return Math.min(econ.win.streakMax, Math.max(0, streak - 1) * econ.win.streakStep);
}

export function dailyReward(econ, dayStreak) {
  return econ.daily.base + Math.min(econ.daily.maxDays - 1, Math.max(0, dayStreak - 1)) * econ.daily.step;
}

export function puzzleReward(econ, puzzleStreak) {
  return econ.puzzle.base + Math.min(econ.puzzle.maxStreak, puzzleStreak) * econ.puzzle.perStreakDay;
}

export function boosterCosts(econ) {
  return econ.boosters;
}

export function avgBoosterCost(econ, mix = DEFAULT_ASSUMPTIONS.boosterMix) {
  let s = 0;
  for (const [k, w] of Object.entries(mix)) s += econ.boosters[k] * w;
  return s;
}

/* ---------- the table of sources and sinks ---------- */

/** Every way coins enter or leave, with the amount at level n (or per event). */
export function ledger(curve, econ, n = 1) {
  const r = winReward(curve, n);
  const themes = econ.decorRewards || [];
  return [
    { kind: 'source', name: 'Level win', amount: r, per: 'level win', note: 'curve.json reward column' },
    {
      kind: 'source',
      name: 'Streak bonus',
      amount: streakBonus(econ, 6),
      per: `win, +${econ.win.streakStep} per consecutive win`,
      note: `up to +${econ.win.streakMax}`,
    },
    {
      kind: 'source',
      name: 'Daily bonus',
      amount: dailyReward(econ, 1),
      per: 'first launch of a day',
      note: `to ${dailyReward(econ, econ.daily.maxDays)} by day ${econ.daily.maxDays}`,
    },
    {
      kind: 'source',
      name: 'Daily puzzle',
      amount: puzzleReward(econ, 0),
      per: 'first win of the day',
      note: `to ${puzzleReward(econ, econ.puzzle.maxStreak)} with a streak`,
    },
    {
      kind: 'source',
      name: 'Rush',
      amount: econ.rush.perPlate,
      per: 'plate served',
      note: `cap ${econ.rush.cap} per run`,
    },
    {
      kind: 'source',
      name: 'Zen',
      amount: Math.round(r * econ.zen.share),
      per: 'board cleared',
      note: `${Math.round(econ.zen.share * 100)}% of the level reward`,
    },
    { kind: 'source', name: 'Boss board', amount: econ.boss.coins, per: 'boss win', note: 'events only' },
    { kind: 'source', name: 'Event rewards', amount: 250, per: 'event finished', note: '250 to 500 in events.json' },
    { kind: 'source', name: 'Season pass', amount: 40, per: 'tier (free track)', note: '6,150 over 30 tiers' },
    {
      kind: 'source',
      name: 'Decor set complete',
      amount: themes.length ? themes[0] : 300,
      per: 'restaurant',
      note: (themes.length ? themes.join('/') : '300 to 700') + ' per set',
    },
    {
      kind: 'source',
      name: 'Chef’s Rescue',
      amount: econ.rescue.coins,
      per: 'purchase',
      note: 'paid; +seat, diner served, belt cleared',
    },
    {
      kind: 'source',
      name: 'Coin products',
      amount: 500,
      per: 'purchase',
      note: 'Pouch 500, Chest 2,600, Starter 600',
    },
    {
      kind: 'sink',
      name: 'VIP seat',
      amount: econ.boosters.vip,
      per: 'use (no inventory)',
      note: 'extra seat for the level',
    },
    {
      kind: 'sink',
      name: 'Takeout',
      amount: econ.boosters.takeout,
      per: 'use (no inventory)',
      note: 'removes a diner',
    },
    {
      kind: 'sink',
      name: 'Send Back',
      amount: econ.boosters.sendback,
      per: 'use (no inventory)',
      note: 'removes a plate',
    },
    { kind: 'sink', name: 'Decor', amount: 250, per: 'item', note: '250 to 1,000, cosmetic' },
  ];
}

/* ---------- the non-payer ---------- */

export const DEFAULT_ASSUMPTIONS = {
  levels: 200,
  runs: 300,
  seed: 20260910,
  /** A booster is worth using when the level's fail rate is at least this. */
  boosterThreshold: 0.2,
  /** A booster cuts the fail rate by this fraction. */
  boosterEffect: 0.6,
  /** Which booster the player reaches for, by share. */
  boosterMix: { sendback: 0.5, vip: 0.3, takeout: 0.2 },
  /** After this many fails in a row on a level with no booster left to buy, the player is at a wall and takes the
      free ad rescue. */
  wallFails: 2,
  /** Session shape: levels per calendar day, so the daily bonus lands every so many levels. */
  levelsPerDay: 8,
  /** Share of days the player also does the daily puzzle. */
  puzzleRate: 0.5,
  /** Fail rates: the curve's targets, or a measured column (from tools/out/curve-report.json). */
  failMode: 'target',
  measured: null,
};

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function failRate(curve, n, a) {
  if (a.failMode === 'measured' && a.measured && typeof a.measured[n - 1] === 'number') return a.measured[n - 1];
  const row = curve.levels[Math.min(curve.levels.length, n) - 1];
  return row ? row.fail : 0.5;
}

/** One player through the levels. Returns the per-level trace. */
export function playOne(curve, econ, a, rng) {
  let coins = econ.start.coins;
  const inv = { ...econ.start.inv };
  let streak = 0,
    dayStreak = 0,
    puzzleStreak = 0;
  const trace = [];
  const kinds = Object.keys(a.boosterMix);
  const pick = () => {
    let r = rng(),
      chosen = kinds[0];
    for (const k of kinds) {
      r -= a.boosterMix[k];
      chosen = k;
      if (r <= 0) break;
    }
    if (inv[chosen] > 0 || coins >= econ.boosters[chosen]) return chosen;
    // Fall back to whatever is affordable, cheapest first.
    const afford = kinds
      .filter((k) => inv[k] > 0 || coins >= econ.boosters[k])
      .sort((x, y) => econ.boosters[x] - econ.boosters[y]);
    return afford[0] || null;
  };
  for (let n = 1; n <= a.levels; n++) {
    let earned = 0;
    if ((n - 1) % a.levelsPerDay === 0) {
      dayStreak++;
      const d = dailyReward(econ, dayStreak);
      coins += d;
      earned += d;
      if (rng() < a.puzzleRate) {
        puzzleStreak++;
        const q = puzzleReward(econ, puzzleStreak);
        coins += q;
        earned += q;
      } else puzzleStreak = 0;
    }
    const p = failRate(curve, n, a);
    const hard = p >= a.boosterThreshold;
    let fails = 0,
      boosters = 0,
      spent = 0,
      wall = 0,
      wanted = 0,
      broke = 0;
    for (let attempt = 0; attempt < 12; attempt++) {
      let pe = p;
      if (hard) {
        wanted++;
        const k = pick();
        if (k) {
          if (inv[k] > 0) inv[k]--;
          else {
            coins -= econ.boosters[k];
            spent += econ.boosters[k];
          }
          boosters++;
          pe = p * (1 - a.boosterEffect);
        } else broke++;
      }
      if (rng() < pe) {
        fails++;
        streak = 0;
        if (fails >= a.wallFails && !pick()) {
          wall = 1; // free ad rescue
          break;
        }
        continue;
      }
      break;
    }
    streak++;
    const w = winReward(curve, n) + streakBonus(econ, streak);
    coins += w;
    earned += w;
    trace.push({ n, p, coins, earned, spent, fails, boosters, wall, wanted, broke });
  }
  return trace;
}

function mean(xs) {
  return xs.reduce((s, x) => s + x, 0) / (xs.length || 1);
}
function pct(xs, q) {
  const s = xs.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

/** Many players, averaged, with the target checks. */
export function simulate(curve, econ, over = {}) {
  const a = { ...DEFAULT_ASSUMPTIONS, ...over };
  const rng = mulberry32(a.seed);
  const runs = [];
  for (let r = 0; r < a.runs; r++) runs.push(playOne(curve, econ, a, rng));
  const perLevel = [];
  for (let i = 0; i < a.levels; i++) {
    const col = runs.map((t) => t[i]);
    const coins = col.map((x) => x.coins);
    perLevel.push({
      n: i + 1,
      fail: col[0].p,
      reward: winReward(curve, i + 1),
      coins: Math.round(mean(coins)),
      coinsP10: Math.round(pct(coins, 0.1)),
      coinsP90: Math.round(pct(coins, 0.9)),
      earned: +mean(col.map((x) => x.earned)).toFixed(1),
      spent: +mean(col.map((x) => x.spent)).toFixed(1),
      fails: +mean(col.map((x) => x.fails)).toFixed(3),
      boosters: +mean(col.map((x) => x.boosters)).toFixed(3),
      walls: +mean(col.map((x) => x.wall)).toFixed(3),
      broke: +mean(col.map((x) => x.broke)).toFixed(3),
    });
  }
  const sum = (k, from = 1, to = a.levels) => perLevel.slice(from - 1, to).reduce((s, x) => s + x[k], 0);
  const decades = [];
  for (let d = 0; d < a.levels / 10; d++) {
    const from = d * 10 + 1,
      to = from + 9;
    decades.push({
      from,
      to,
      fails: +sum('fails', from, to).toFixed(2),
      boosters: +sum('boosters', from, to).toFixed(2),
      walls: +sum('walls', from, to).toFixed(2),
    });
  }
  const income = sum('earned');
  const boosterCost = avgBoosterCost(econ, a.boosterMix);
  const wallsAfter30 = sum('walls', 31, a.levels);
  const summary = {
    levels: a.levels,
    runs: a.runs,
    income: Math.round(income),
    incomePerLevel: +(income / a.levels).toFixed(1),
    avgBoosterCost: Math.round(boosterCost),
    /** How many levels of income pay for one booster: the "one every three levels" target. */
    levelsPerBooster: +(boosterCost / (income / a.levels)).toFixed(2),
    boostersUsed: +sum('boosters').toFixed(1),
    boostersPer3: +(sum('boosters') / (a.levels / 3)).toFixed(2),
    failsTotal: +sum('fails').toFixed(1),
    wallsTotal: +sum('walls').toFixed(2),
    wallsAfter30: +wallsAfter30.toFixed(2),
    wallSpacingAfter30: wallsAfter30 > 0 ? +((a.levels - 30) / wallsAfter30).toFixed(1) : Infinity,
    wallsBefore30: +sum('walls', 1, 30).toFixed(2),
    endCoins: perLevel[a.levels - 1].coins,
    minCoins: Math.min(...perLevel.map((x) => x.coinsP10)),
    brokeLevels: +sum('broke').toFixed(1),
  };
  return { assumptions: a, perLevel, decades, summary };
}

/* ---------- targets ---------- */

export const TARGETS = {
  /** Income buys one booster every this many levels (band around 3). */
  levelsPerBooster: [2.5, 3.5],
  /** Walls after level 30, one every ~15 levels over 170 levels: 11.3, band. */
  wallsAfter30: [8.5, 14.5],
  /** Walls before level 30 should be rare. */
  wallsBefore30Max: 1.5,
};

export function checkTargets(summary, targets = TARGETS) {
  const out = [];
  out.push({
    name: 'one booster every three levels',
    value: summary.levelsPerBooster,
    band: targets.levelsPerBooster,
    ok:
      summary.levelsPerBooster >= targets.levelsPerBooster[0] &&
      summary.levelsPerBooster <= targets.levelsPerBooster[1],
  });
  out.push({
    name: 'a wall roughly every 15 levels after 30',
    value: summary.wallsAfter30,
    band: targets.wallsAfter30,
    ok: summary.wallsAfter30 >= targets.wallsAfter30[0] && summary.wallsAfter30 <= targets.wallsAfter30[1],
  });
  out.push({
    name: 'few walls before 30',
    value: summary.wallsBefore30,
    band: [0, targets.wallsBefore30Max],
    ok: summary.wallsBefore30 <= targets.wallsBefore30Max,
  });
  return out;
}

/** A reward column from a base and a slope, integer coins. */
export function rewardColumn(levels, base, slope) {
  return Array.from({ length: levels }, (_, i) => Math.max(5, Math.round(base + slope * (i + 1))));
}

/** Search bases and slopes for the column that meets every target, preferring the one nearest the ideals. */
export function tune(curve, econ, over = {}, grid = { base: [10, 80, 2], slope: [0, 0.6, 0.05] }) {
  const results = [];
  for (let base = grid.base[0]; base <= grid.base[1]; base += grid.base[2])
    for (let slope = grid.slope[0]; slope <= grid.slope[1] + 1e-9; slope += grid.slope[2]) {
      const col = rewardColumn(curve.levels.length, base, +slope.toFixed(3));
      const c2 = { ...curve, levels: curve.levels.map((l, i) => ({ ...l, reward: col[i] })) };
      const s = simulate(c2, econ, { ...over, runs: over.runs || 80 }).summary;
      const checks = checkTargets(s);
      const score = Math.abs(s.levelsPerBooster - 3) + Math.abs(s.wallsAfter30 - 11.3) / 4 + s.wallsBefore30 / 2;
      results.push({ base, slope: +slope.toFixed(3), summary: s, ok: checks.every((c) => c.ok), score });
    }
  results.sort((x, y) => Number(y.ok) - Number(x.ok) || x.score - y.score);
  return results;
}

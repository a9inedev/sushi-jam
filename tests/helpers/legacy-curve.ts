/* The schedule the pre-curve engine computed from formulas, as a Curve. The parity test installs it so the
   legacy fixture keeps guarding the generator's RNG order even as curve.json is tuned. */
import { bundledCurve, type Curve, type CurveLevel } from '../../src/data/curve';

type Tier = 'Easy' | 'Medium' | 'Hard' | 'Super Hard';

function schedTier(n: number): Tier {
  if (n <= 3) return 'Easy';
  const m = n % 10;
  if (m === 0) return 'Super Hard';
  if (m >= 7) return 'Hard';
  if (m <= 3 && n < 10) return 'Easy';
  return 'Medium';
}

const TARGET: Record<Tier, number> = { Easy: 0.06, Medium: 0.2, Hard: 0.4, 'Super Hard': 0.6 };
const BAND: Record<Tier, [number, number]> = {
  Easy: [0, 0.12],
  Medium: [0.1, 0.35],
  Hard: [0.25, 0.55],
  'Super Hard': [0.45, 0.75],
};

export function legacyLevel(n: number): CurveLevel {
  const tier = schedTier(n);
  let colors = Math.min(7, 3 + Math.floor((n - 1) / 5));
  if (tier === 'Super Hard') colors = Math.min(7, colors + 1);
  const cols = Math.min(6, 3 + Math.floor(n / 6)),
    rows = Math.min(6, 3 + Math.floor((n + 3) / 6));
  const fill = { Easy: 0.7, Medium: 0.8, Hard: 0.88, 'Super Hard': 0.92 }[tier];
  const app = ({ Easy: [2, 3], Medium: [2, 4], Hard: [3, 4], 'Super Hard': [3, 5] } as Record<Tier, [number, number]>)[
    tier
  ];
  const visibleNext = { Easy: 3, Medium: 3, Hard: 2, 'Super Hard': 1 }[tier];
  const beltCap = tier === 'Super Hard' ? 7 : 8;
  const speed = 1 / Math.max(6, 9 - n * 0.12);
  return {
    n,
    fail: TARGET[tier],
    reward: 50 + n * 2,
    band: BAND[tier],
    rows,
    cols,
    colors,
    seats: 4,
    beltCap,
    visibleNext,
    app,
    fill,
    speed,
  };
}

export function legacyCurve(count = 200): Curve {
  return {
    v: 1,
    solver: { ...bundledCurve().solver },
    levels: Array.from({ length: count }, (_, i) => legacyLevel(i + 1)),
  };
}

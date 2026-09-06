export type Ease = (u: number) => number;

export const easeIn: Ease = (u) => u * u;
export const easeOut: Ease = (u) => 1 - (1 - u) * (1 - u);
export const easeInOut: Ease = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);
export const easeBack: Ease = (u) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2);
};

function dayKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function todayKey(now: Date = new Date()): string {
  return dayKey(now);
}

export function yesterdayKey(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return dayKey(d);
}

/** ISO week key, e.g. 2026-W36. */
export function weekKey(now: Date = new Date()): string {
  const t = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return (
    t.getUTCFullYear() + '-W' + String(Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)).padStart(2, '0')
  );
}

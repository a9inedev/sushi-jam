import { G } from '../engine/state';
import { todayKey, weekKey, yesterdayKey } from '../engine/util';
import { S, save } from './save';

/** Daily bonus: 100 coins on day one, +25 per consecutive day up to day seven. */
export function dailyReward(streak: number): number {
  return 100 + Math.min(6, streak - 1) * 25;
}

export function checkDaily(): void {
  const today = todayKey();
  if (S.lastDaily === today) return;
  S.dailyStreak = S.lastDaily === yesterdayKey() ? (S.dailyStreak || 0) + 1 : 1;
  G.screen = { type: 'daily', reward: dailyReward(S.dailyStreak), t: 0 };
}

export function checkWeekly(): void {
  const wk = weekKey();
  if (S.weekKey !== wk) {
    S.weekKey = wk;
    S.weekly = 0;
    save();
  }
}

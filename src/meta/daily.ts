import { G } from '../engine/state';
import { todayKey, weekKey, yesterdayKey } from '../engine/util';
import { dailyReward as dailyCoins } from '../data/products';
import { S, save } from './save';

/** Daily bonus: products.json daily.base on day one, rising by daily.step per consecutive day. */
export function dailyReward(streak: number): number {
  return dailyCoins(streak);
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

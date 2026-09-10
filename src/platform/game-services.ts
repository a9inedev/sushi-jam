/* The GameServices Capacitor plugin: Game Center on iOS, Play Games on Android (native code lives in
   android/app/src/main/java/com/a9inedev/sushijam/GameServicesPlugin.java and ios/App/App/GameServicesPlugin.swift).
   The web implementation keeps a per-device board so the same UI works in a browser. */

import { registerPlugin, type WebPlugin } from '@capacitor/core';

export interface AuthResult {
  signedIn: boolean;
  playerId?: string;
  displayName?: string;
}

export interface ScoreEntry {
  rank: number;
  score: number;
  name: string;
  playerId?: string;
}

export interface GameServicesPlugin {
  status(): Promise<AuthResult>;
  signIn(): Promise<AuthResult>;
  submitScore(o: { leaderboardId: string; score: number }): Promise<void>;
  loadScores(o: { leaderboardId: string; span: 'weekly' | 'alltime'; limit: number }): Promise<{
    entries: ScoreEntry[];
    player?: ScoreEntry;
  }>;
  showLeaderboard(o: { leaderboardId: string }): Promise<void>;
}

export const LOCAL_KEY = 'sushijam.lbLocal';

/** Browser fallback: one board per id, only ever holding this device's best. */
class GameServicesWeb implements GameServicesPlugin {
  private read(): Record<string, number> {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}') as Record<string, number>;
    } catch {
      return {};
    }
  }
  private write(v: Record<string, number>): void {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
    } catch {
      /* storage blocked: the score lives for this session only */
    }
  }
  async status(): Promise<AuthResult> {
    return { signedIn: true, playerId: 'local', displayName: '' };
  }
  async signIn(): Promise<AuthResult> {
    return this.status();
  }
  async submitScore(o: { leaderboardId: string; score: number }): Promise<void> {
    const v = this.read();
    v[o.leaderboardId] = Math.max(v[o.leaderboardId] || 0, o.score);
    this.write(v);
  }
  async loadScores(o: { leaderboardId: string }): Promise<{ entries: ScoreEntry[]; player?: ScoreEntry }> {
    const best = this.read()[o.leaderboardId];
    if (!best) return { entries: [] };
    const me = { rank: 1, score: best, name: '', playerId: 'local' };
    return { entries: [me], player: me };
  }
  async showLeaderboard(): Promise<void> {
    /* nothing native to open */
  }
}

export const GameServices = registerPlugin<GameServicesPlugin>('GameServices', {
  web: () => Promise.resolve(new GameServicesWeb() as unknown as WebPlugin),
});

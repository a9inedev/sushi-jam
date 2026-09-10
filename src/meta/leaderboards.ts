/* Leaderboards at runtime: a backend (Game Center, Play Games, the browser's local board, or a mock for
   tests), the sign-in state, a read cache per board, and the offline queue that posts scores whenever it can:
   at boot, on sign-in, when the network comes back, when the app returns to the foreground, and right after
   a score is earned. */

import { BOARD_IDS, BOARD_ROWS, type BoardId } from '../data/leaderboards';
import { toast } from '../engine/state';
import { weekKey } from '../engine/util';
import { t } from '../i18n';
import { GameServices, type AuthResult, type ScoreEntry } from '../platform/game-services';
import { isNative, onAppActive, platform } from '../platform/native';
import { enqueue, flush, liveQueue } from './leaderboards-core';
import { S, save } from './save';

export interface Entry {
  rank: number;
  name: string;
  score: number;
  me: boolean;
}

export interface Backend {
  kind: 'native' | 'local' | 'mock';
  /** Shown on buttons: "Game Center", "Play Games". */
  service: string;
  status(): Promise<AuthResult>;
  signIn(): Promise<AuthResult>;
  submit(board: BoardId, score: number): Promise<void>;
  read(board: BoardId, limit: number): Promise<{ entries: ScoreEntry[]; player?: ScoreEntry }>;
  show(board: BoardId): Promise<void>;
}

function boardId(board: BoardId): string {
  return platform === 'android' ? BOARD_IDS[board].android : BOARD_IDS[board].ios;
}

const pluginBackend: Backend = {
  kind: isNative ? 'native' : 'local',
  service: platform === 'ios' ? 'Game Center' : platform === 'android' ? 'Play Games' : 'Local', // i18n-ignore
  status: () => GameServices.status(),
  signIn: () => GameServices.signIn(),
  submit: (board, score) => GameServices.submitScore({ leaderboardId: boardId(board), score }),
  read: (board, limit) =>
    GameServices.loadScores({ leaderboardId: boardId(board), span: board === 'weekly' ? 'weekly' : 'alltime', limit }),
  show: (board) => GameServices.showLeaderboard({ leaderboardId: boardId(board) }),
};

let backend: Backend = pluginBackend;

export interface BoardView {
  entries: Entry[];
  me: Entry | null;
  at: number;
  loading: boolean;
  error: string | null;
}

export const lb = {
  signedIn: false,
  player: null as { id: string; name: string } | null,
  busy: false,
  lastError: null as string | null,
  lastFlush: 'never' as 'never' | 'posted' | 'deferred' | 'failed' | 'nothing',
  boards: {} as Partial<Record<BoardId, BoardView>>,
  /** Test hook: pretend the network is down. */
  forceOffline: false,
};

export function backendInfo(): { kind: Backend['kind']; service: string } {
  return { kind: backend.kind, service: backend.service };
}

export function isOffline(): boolean {
  if (lb.forceOffline) return true;
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function pendingCount(): number {
  return liveQueue(S.lbQueue, weekKey()).length;
}

function applyAuth(a: AuthResult): void {
  lb.signedIn = !!a.signedIn;
  lb.player = a.signedIn ? { id: a.playerId || '', name: a.displayName || '' } : null;
}

/* ---------- queue ---------- */

function record(board: BoardId, score: number): void {
  if (score <= 0) return;
  const item = { board, score, at: Date.now(), week: board === 'weekly' ? weekKey() : undefined };
  if (item.week === undefined) delete item.week;
  S.lbQueue = enqueue(S.lbQueue, item);
  save();
  void flushQueue();
}

/** Levels cleared this week, after a level win. */
export function recordWeekly(levels: number): void {
  record('weekly', levels);
}

/** A rush run's score, when it is a new best. */
export function recordRush(score: number): void {
  record('rush', score);
}

/** Post what is waiting. Returns what happened; never throws. */
export async function flushQueue(manual = false): Promise<typeof lb.lastFlush> {
  const done = (r: typeof lb.lastFlush, err: string | null = null) => {
    lb.lastFlush = r;
    lb.lastError = err;
    if (manual && r === 'posted') toast(t('ranks.posted'), 2);
    if (manual && r === 'failed') toast(t('ranks.error'), 2);
    return r;
  };
  if (lb.busy) return lb.lastFlush;
  const week = weekKey();
  const live = liveQueue(S.lbQueue, week);
  if (live.length !== S.lbQueue.length) {
    S.lbQueue = live;
    save();
  }
  if (!live.length) return done('nothing');
  if (isOffline() || !lb.signedIn) return done('deferred');
  lb.busy = true;
  try {
    const r = await flush(S.lbQueue, week, (b, s) => backend.submit(b, s));
    S.lbQueue = r.queue;
    save();
    for (const p of r.posted) delete lb.boards[p.board];
    if (r.error) return done('failed', r.error);
    return done(r.posted.length ? 'posted' : 'nothing');
  } catch (e) {
    return done('failed', String((e as Error)?.message || e));
  } finally {
    lb.busy = false;
  }
}

/* ---------- auth and reads ---------- */

export async function initLeaderboards(): Promise<void> {
  try {
    applyAuth(await backend.status());
  } catch (e) {
    lb.lastError = String((e as Error)?.message || e);
  }
  void flushQueue();
  if (typeof window !== 'undefined') window.addEventListener('online', () => void flushQueue());
  onAppActive((active) => {
    if (active) void flushQueue();
  });
}

export async function signIn(): Promise<boolean> {
  if (lb.busy) return lb.signedIn;
  try {
    applyAuth(await backend.signIn());
  } catch (e) {
    lb.lastError = String((e as Error)?.message || e);
    lb.signedIn = false;
  }
  if (!lb.signedIn) toast(t('ranks.signInFailed'), 2.4);
  else {
    lb.boards = {};
    await flushQueue();
  }
  return lb.signedIn;
}

const FRESH_MS = 60000;

function view(id: BoardId): BoardView {
  let v = lb.boards[id];
  if (!v) {
    v = { entries: [], me: null, at: 0, loading: false, error: null };
    lb.boards[id] = v;
  }
  return v;
}

/** The cached view of a board, kicking off a read when it is stale. */
export function board(id: BoardId, force = false): BoardView {
  const v = view(id);
  const stale = Date.now() - v.at > FRESH_MS;
  if ((force || stale) && !v.loading && lb.signedIn && !isOffline()) void refresh(id);
  return v;
}

export async function refresh(id: BoardId): Promise<BoardView> {
  const v = view(id);
  v.loading = true;
  try {
    const r = await backend.read(id, BOARD_ROWS);
    const myId = lb.player ? lb.player.id : '';
    const own = (e: ScoreEntry) => !!e.playerId && e.playerId === myId;
    v.entries = (r.entries || []).map((e) => ({ rank: e.rank, name: e.name || '', score: e.score, me: own(e) }));
    v.me = r.player ? { rank: r.player.rank, name: r.player.name || '', score: r.player.score, me: true } : null;
    if (v.me && !v.entries.some((e) => e.me)) {
      const mine = v.entries.find((e) => e.rank === v.me!.rank && e.score === v.me!.score);
      if (mine) mine.me = true;
    }
    v.error = null;
  } catch (e) {
    v.error = String((e as Error)?.message || e);
  } finally {
    v.at = Date.now();
    v.loading = false;
  }
  return v;
}

export function showNative(id: BoardId): void {
  if (backend.kind !== 'native') return;
  backend.show(id).catch(() => toast(t('ranks.error'), 2));
}

/* ---------- test backend ---------- */

export interface MockOptions {
  fail?: boolean;
  offline?: boolean;
  signedIn?: boolean;
  name?: string;
  rivals?: { name: string; score: number }[];
}

export interface MockState {
  submitted: { board: BoardId; score: number }[];
  opts: MockOptions;
}

let mock: MockState | null = null;

/** Swap in a scripted backend (dev panel and smoke test). Passing null restores the real one. */
export function installMock(opts: MockOptions | null): MockState | null {
  if (!opts) {
    mock = null;
    backend = pluginBackend;
    lb.forceOffline = false;
    lb.boards = {};
    return null;
  }
  const m: MockState = mock && backend.kind === 'mock' ? mock : { submitted: [], opts: {} };
  m.opts = { ...m.opts, ...opts };
  mock = m;
  lb.forceOffline = !!m.opts.offline;
  const auth = (): AuthResult =>
    m.opts.signedIn === false
      ? { signedIn: false }
      : { signedIn: true, playerId: 'me', displayName: m.opts.name || 'Tester' }; // i18n-ignore
  backend = {
    kind: 'mock',
    service: 'Mock', // i18n-ignore
    status: async () => auth(),
    signIn: async () => auth(),
    submit: async (board, score) => {
      if (m.opts.fail) throw new Error('mock: submit refused');
      m.submitted.push({ board, score });
    },
    read: async (board) => {
      if (m.opts.fail) throw new Error('mock: read refused');
      let best = 0;
      for (const s of m.submitted) if (s.board === board) best = Math.max(best, s.score);
      const rows = (m.opts.rivals || []).map((r) => ({ name: r.name, score: r.score, playerId: 'r:' + r.name }));
      if (best > 0) rows.push({ name: m.opts.name || 'Tester', score: best, playerId: 'me' }); // i18n-ignore
      rows.sort((a, b) => b.score - a.score);
      const entries = rows.map((r, i) => ({ rank: i + 1, ...r }));
      return { entries, player: entries.find((e) => e.playerId === 'me') };
    },
    show: async () => {},
  };
  lb.boards = {};
  applyAuth(auth());
  return m;
}

export function mockState(): MockState | null {
  return mock;
}

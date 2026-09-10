/* The offline submission queue, pure. Scores are queued the moment they are earned and posted when a
   backend, a sign-in and a network are all there; nothing here touches the save or the platform. */

import type { BoardId } from '../data/leaderboards';

export interface QueuedScore {
  board: BoardId;
  score: number;
  /** When it was earned, ms. */
  at: number;
  /** Weekly scores belong to one ISO week; a queue that outlives the week drops them. */
  week?: string;
}

/** Add a score, keeping only the best per board (per week for the weekly board). */
export function enqueue(queue: QueuedScore[], item: QueuedScore): QueuedScore[] {
  const same = (q: QueuedScore) => q.board === item.board && (item.board !== 'weekly' || q.week === item.week);
  const rest = queue.filter((q) => !same(q));
  const prev = queue.find(same);
  const best = prev && prev.score > item.score ? prev : item;
  return rest.concat([best]).sort((a, b) => a.at - b.at);
}

/** Entries that can still be posted: weekly scores only inside their own week. */
export function liveQueue(queue: QueuedScore[], week: string): QueuedScore[] {
  return queue.filter((q) => q.board !== 'weekly' || q.week === week);
}

export interface FlushResult {
  queue: QueuedScore[];
  posted: QueuedScore[];
  error: string | null;
}

/** Post every live entry in order; stop at the first failure and keep it (and everything after it). */
export async function flush(
  queue: QueuedScore[],
  week: string,
  submit: (board: BoardId, score: number) => Promise<void>
): Promise<FlushResult> {
  const live = liveQueue(queue, week);
  const posted: QueuedScore[] = [];
  for (let i = 0; i < live.length; i++) {
    const q = live[i];
    try {
      await submit(q.board, q.score);
      posted.push(q);
    } catch (e) {
      return { queue: live.slice(i), posted, error: String((e as Error)?.message || e) };
    }
  }
  return { queue: [], posted, error: null };
}

/** Validate a queue read back from a save. */
export function cleanQueue(x: unknown, max = 20): QueuedScore[] {
  if (!Array.isArray(x)) return [];
  const out: QueuedScore[] = [];
  for (const v of x) {
    if (!v || typeof v !== 'object') continue;
    const q = v as Record<string, unknown>;
    if (q.board !== 'weekly' && q.board !== 'rush') continue;
    if (typeof q.score !== 'number' || !Number.isFinite(q.score) || q.score < 0) continue;
    const item: QueuedScore = {
      board: q.board,
      score: Math.floor(q.score),
      at: typeof q.at === 'number' && Number.isFinite(q.at) ? q.at : 0,
    };
    if (typeof q.week === 'string') item.week = q.week;
    out.push(item);
  }
  return out.slice(-max);
}

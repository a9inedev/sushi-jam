/* The offline score queue and the v10 save fields: scores queue when they cannot post, coalesce to the best
   per board, drop weekly entries that outlive their week, and post in order once a backend accepts them. */
import { describe, expect, it } from 'vitest';
import { cleanQueue, enqueue, flush, liveQueue, type QueuedScore } from '../src/meta/leaderboards-core';
import { defaultSave, migrateV9toV10, normalize, SAVE_VERSION } from '../src/meta/save-schema';

const W = '2026-W37';

describe('queue', () => {
  it('keeps the best score per board, per week for the weekly board', () => {
    let q: QueuedScore[] = [];
    q = enqueue(q, { board: 'weekly', score: 3, at: 1, week: W });
    q = enqueue(q, { board: 'weekly', score: 5, at: 2, week: W });
    q = enqueue(q, { board: 'weekly', score: 4, at: 3, week: W });
    q = enqueue(q, { board: 'rush', score: 12, at: 4 });
    q = enqueue(q, { board: 'rush', score: 9, at: 5 });
    q = enqueue(q, { board: 'weekly', score: 1, at: 6, week: '2026-W38' });
    expect(q.map((e) => [e.board, e.score, e.week])).toEqual([
      ['weekly', 5, W],
      ['rush', 12, undefined],
      ['weekly', 1, '2026-W38'],
    ]);
  });

  it('drops weekly scores from another week, keeps rush scores forever', () => {
    const q: QueuedScore[] = [
      { board: 'weekly', score: 5, at: 1, week: '2026-W36' },
      { board: 'rush', score: 12, at: 2 },
      { board: 'weekly', score: 2, at: 3, week: W },
    ];
    expect(liveQueue(q, W).map((e) => [e.board, e.score])).toEqual([
      ['rush', 12],
      ['weekly', 2],
    ]);
  });

  it('posts in order and stops at the first failure without losing anything', async () => {
    const q: QueuedScore[] = [
      { board: 'rush', score: 12, at: 1 },
      { board: 'weekly', score: 2, at: 2, week: W },
      { board: 'rush', score: 15, at: 3 },
    ];
    const posted: string[] = [];
    let failOn = 'weekly';
    const submit = async (b: string, s: number) => {
      if (b === failOn) throw new Error('offline');
      posted.push(b + ':' + s);
    };
    const r1 = await flush(q, W, submit);
    expect(posted).toEqual(['rush:12']);
    expect(r1.error).toBe('offline');
    expect(r1.queue.map((e) => e.score)).toEqual([2, 15]);
    failOn = '';
    const r2 = await flush(r1.queue, W, submit);
    expect(posted).toEqual(['rush:12', 'weekly:2', 'rush:15']);
    expect(r2.queue).toEqual([]);
    expect(r2.error).toBeNull();
    expect(r2.posted.length).toBe(2);
  });

  it('cleans a queue read back from a save', () => {
    const raw = [
      { board: 'weekly', score: 3.7, at: 5, week: W },
      { board: 'nope', score: 1, at: 1 },
      { board: 'rush', score: -1, at: 1 },
      { board: 'rush', score: 7 },
      'junk',
    ];
    expect(cleanQueue(raw)).toEqual([
      { board: 'weekly', score: 3, at: 5, week: W },
      { board: 'rush', score: 7, at: 0 },
    ]);
    expect(cleanQueue(null)).toEqual([]);
  });
});

describe('save v10', () => {
  it('adds the profile, best streak and queue, seeding the best streak from the current one', () => {
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(10);
    const v9: Record<string, unknown> = { ...(defaultSave() as unknown as Record<string, unknown>), streak: 4 };
    delete v9.profile;
    delete v9.bestStreak;
    delete v9.lbQueue;
    const v10 = migrateV9toV10(v9);
    expect(v10.bestStreak).toBe(4);
    expect(v10.profile).toEqual({ name: '', avatar: 0 });
    expect(v10.lbQueue).toEqual([]);
    const s = normalize({
      ...v10,
      profile: { name: 'A very long name indeed, longer than allowed', avatar: 99 },
      bestStreak: -3,
      lbQueue: [{ board: 'rush', score: 4, at: 1 }],
    });
    expect(s.profile.name.length).toBeLessThanOrEqual(16);
    expect(s.profile.avatar).toBe(0);
    expect(s.bestStreak).toBe(0);
    expect(s.lbQueue).toEqual([{ board: 'rush', score: 4, at: 1 }]);
  });
});

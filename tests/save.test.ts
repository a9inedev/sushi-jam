import { beforeEach, describe, expect, it } from 'vitest';
import {
  GameCenterSaveProvider,
  KEYS,
  LocalSaveProvider,
  MemoryStorage,
  PlayGamesSaveProvider,
  cloudProviderFor,
  type StorageLike,
} from '../src/meta/save-providers';
import {
  SAVE_VERSION,
  checksum,
  defaultSave,
  detectVersion,
  envelopeFor,
  migrate,
  migrateV1toV2,
  migrateV2toV3,
  migrateV3toV4,
  migrateV4toV5,
  normalize,
  parseEnvelope,
} from '../src/meta/save-schema';
import * as mgr from '../src/meta/save';

/* ---------- schema ---------- */

describe('envelope', () => {
  it('round-trips with a matching checksum', () => {
    const s = defaultSave();
    s.level = 12;
    const { env, json, dataJson } = envelopeFor(s, 1000);
    expect(env.v).toBe(SAVE_VERSION);
    expect(env.sum).toBe(checksum(dataJson));
    const back = parseEnvelope(json);
    expect(back).not.toBeNull();
    expect(back?.savedAt).toBe(1000);
    expect(back?.data.level).toBe(12);
  });

  it('rejects malformed JSON, non-envelopes, pre-v3 blobs and checksum mismatches', () => {
    expect(parseEnvelope(null)).toBeNull();
    expect(parseEnvelope('')).toBeNull();
    expect(parseEnvelope('{"v":3,"sum":1,"data":{"level":9')).toBeNull();
    expect(parseEnvelope('[1,2,3]')).toBeNull();
    expect(parseEnvelope(JSON.stringify({ level: 3, coins: 10 }))).toBeNull();
    const { json } = envelopeFor(defaultSave(), 5);
    const tampered = json.replace('"coins":300', '"coins":999999');
    expect(parseEnvelope(tampered)).toBeNull();
  });
});

describe('version detection', () => {
  it('tells v1, v2 and v3 apart', () => {
    expect(detectVersion({ level: 4, coins: 10, sound: true })).toBe(1);
    expect(detectVersion({ level: 4, coins: 10, inv: { vip: 1 }, stats: [] })).toBe(2);
    expect(detectVersion({ v: 3, savedAt: 1, sum: 2, data: {} })).toBe(3);
    expect(detectVersion({ v: 4, data: {} })).toBe(4);
    expect(detectVersion(null)).toBeNull();
    expect(detectVersion('nope')).toBeNull();
    expect(detectVersion({ hello: 'world' })).toBeNull();
    expect(detectVersion([1, 2])).toBeNull();
  });
});

describe('migration v1 -> v2', () => {
  it('carries level, coins and sound; everything else takes defaults', () => {
    const out = migrateV1toV2({ level: 17, coins: 940, sound: false });
    expect(out.level).toBe(17);
    expect(out.coins).toBe(940);
    expect(out.sound).toBe(false);
    expect(out.decor).toEqual([]);
    expect(out.inv).toEqual({ vip: 0, takeout: 0, sendback: 0 });
    expect('haptics' in out).toBe(false);
  });

  it('falls back on missing or bad values', () => {
    const out = migrateV1toV2({});
    expect(out.level).toBe(1);
    expect(out.coins).toBe(300);
    expect(out.sound).toBe(true);
    expect(migrateV1toV2({ level: -3, coins: 'lots' }).level).toBe(1);
  });
});

describe('migration v2 -> v3', () => {
  it('adds haptics on and fills missing inventory keys, keeping everything else', () => {
    const out = migrateV2toV3({
      level: 33,
      coins: 12,
      decor: ['noren'],
      inv: { vip: 2 },
      stats: [{ n: 1 }],
      sound: false,
    });
    expect(out.level).toBe(33);
    expect(out.coins).toBe(12);
    expect(out.decor).toEqual(['noren']);
    expect(out.inv).toEqual({ vip: 2, takeout: 0, sendback: 0 });
    expect(out.stats).toEqual([{ n: 1 }]);
    expect(out.sound).toBe(false);
    expect(out.haptics).toBe(true);
  });

  it('respects an explicit haptics value', () => {
    expect(migrateV2toV3({ haptics: false }).haptics).toBe(false);
  });
});

describe('migrate (chain)', () => {
  it('v1 all the way to current', () => {
    const m = migrate({ level: 5, coins: 50, sound: false });
    expect(m?.from).toBe(1);
    expect(m?.state.level).toBe(5);
    expect(m?.state.coins).toBe(50);
    expect(m?.state.sound).toBe(false);
    expect(m?.state.haptics).toBe(true);
    expect(m?.state.best).toBe(5);
  });

  it('v2 keeps level, coins, decor and stats', () => {
    const stats = Array.from({ length: 3 }, (_, i) => ({ n: i + 1, result: 'win' }));
    const m = migrate({ level: 41, coins: 1234, decor: ['noren', 'tank'], stats, inv: { takeout: 1 } });
    expect(m?.from).toBe(2);
    expect(m?.state.level).toBe(41);
    expect(m?.state.coins).toBe(1234);
    expect(m?.state.decor).toEqual(['noren', 'tank']);
    expect(m?.state.stats.length).toBe(3);
    expect(m?.state.inv).toEqual({ vip: 0, takeout: 1, sendback: 0 });
  });

  it('current envelope is identity apart from normalisation', () => {
    const s = defaultSave();
    s.level = 9;
    s.coins = 7;
    s.best = 9; // normalize keeps best >= level
    const { env } = envelopeFor(s, 1);
    const m = migrate(env);
    expect(m?.from).toBe(SAVE_VERSION);
    expect(m?.state).toEqual(s);
  });

  it('v3 envelope gains reduceMotion off and keeps everything else', () => {
    const data = defaultSave() as unknown as Record<string, unknown>;
    delete data.reduceMotion;
    data.level = 21;
    data.haptics = false;
    const m = migrate({ v: 3, savedAt: 1, sum: checksum(JSON.stringify(data)), data });
    expect(m?.from).toBe(3);
    expect(m?.state.level).toBe(21);
    expect(m?.state.haptics).toBe(false);
    expect(m?.state.reduceMotion).toBe(false);
    expect(migrateV3toV4({ reduceMotion: true }).reduceMotion).toBe(true);
  });

  it('v4 envelope gains the three volumes with defaults, and keeps explicit ones', () => {
    const data = defaultSave() as unknown as Record<string, unknown>;
    delete data.volMusic;
    delete data.volSfx;
    delete data.volUi;
    data.level = 12;
    const m = migrate({ v: 4, savedAt: 1, sum: checksum(JSON.stringify(data)), data });
    expect(m?.from).toBe(4);
    expect(m?.state.level).toBe(12);
    expect(m?.state.volMusic).toBe(0.6);
    expect(m?.state.volSfx).toBe(1);
    expect(m?.state.volUi).toBe(0.8);
    expect(migrateV4toV5({ volMusic: 0.2 }).volMusic).toBe(0.2);
    expect(normalize({ volMusic: 7, volSfx: -1, volUi: 'loud' })).toMatchObject({ volMusic: 1, volSfx: 0, volUi: 0.8 });
  });

  it('a save from a newer build is read best-effort', () => {
    const s = defaultSave() as unknown as Record<string, unknown>;
    s.level = 8;
    s.futureField = { anything: true };
    const m = migrate({ v: SAVE_VERSION + 1, savedAt: 1, sum: 0, data: s });
    expect(m?.from).toBe(SAVE_VERSION + 1);
    expect(m?.state.level).toBe(8);
    expect('futureField' in (m?.state as object)).toBe(false);
  });

  it('returns null for things that are not saves', () => {
    expect(migrate(42)).toBeNull();
    expect(migrate({ unrelated: 1 })).toBeNull();
  });
});

describe('normalize', () => {
  it('sanitises garbage fields to defaults and clamps ranges', () => {
    const n = normalize({
      level: NaN,
      coins: -50,
      streak: 2.7,
      decor: ['noren', 5, null],
      inv: { vip: -1, takeout: 'two', sendback: 3.9 },
      stats: [{ n: 1 }, 'junk', null],
      seenMech: ['wasabi', 'bogus'],
      sound: 'yes',
    });
    expect(n.level).toBe(1);
    expect(n.coins).toBe(300); // out of range falls back to the default rather than clamping
    expect(n.streak).toBe(2);
    expect(n.decor).toEqual(['noren']);
    expect(n.inv).toEqual({ vip: 0, takeout: 0, sendback: 3 });
    expect(n.stats.length).toBe(1);
    expect(n.seenMech).toEqual(['wasabi']);
    expect(n.sound).toBe(true);
  });

  it('caps the stats log at 500 records, keeping the newest', () => {
    const stats = Array.from({ length: 620 }, (_, i) => ({ n: i }));
    const n = normalize({ stats });
    expect(n.stats.length).toBe(500);
    expect((n.stats[0] as unknown as { n: number }).n).toBe(120);
  });

  it('best never drops below level', () => {
    expect(normalize({ level: 30, best: 4 }).best).toBe(30);
  });
});

/* ---------- local provider ---------- */

class FlakyStorage extends MemoryStorage {
  failOn: Set<string> = new Set();
  override setItem(key: string, value: string): void {
    if (this.failOn.has(key)) throw new Error('QuotaExceededError');
    super.setItem(key, value);
  }
}

function envJson(level: number, savedAt: number): string {
  const s = defaultSave();
  s.level = level;
  s.coins = level * 100;
  return envelopeFor(s, savedAt).json;
}

describe('LocalSaveProvider', () => {
  let st: FlakyStorage;
  let p: LocalSaveProvider;
  beforeEach(() => {
    st = new FlakyStorage();
    p = new LocalSaveProvider(st);
  });

  it('loads nothing from empty storage', () => {
    expect(p.load()).toMatchObject({ state: null, source: 'none', recovered: false, migratedFrom: null });
  });

  it('writes atomically: temp is promoted to main and removed', () => {
    expect(p.write(envJson(2, 10), { rotateBackup: true })).toBe(true);
    expect(st.getItem(KEYS.tmp)).toBeNull();
    expect(parseEnvelope(st.getItem(KEYS.main))?.data.level).toBe(2);
    expect(p.load()).toMatchObject({ source: 'main', recovered: false });
  });

  it('seeds the backup on the second write and rotates it on request', () => {
    p.write(envJson(1, 10), { rotateBackup: false });
    expect(st.getItem(KEYS.bak)).toBeNull(); // nothing to back up yet
    p.write(envJson(2, 20), { rotateBackup: false });
    expect(parseEnvelope(st.getItem(KEYS.bak))?.data.level).toBe(1); // seeded because none existed
    p.write(envJson(3, 30), { rotateBackup: false });
    expect(parseEnvelope(st.getItem(KEYS.bak))?.data.level).toBe(1); // untouched without rotation
    p.write(envJson(4, 40), { rotateBackup: true });
    expect(parseEnvelope(st.getItem(KEYS.bak))?.data.level).toBe(3); // previous main
  });

  it('keeps the old main intact when the main write fails, and recovers from temp next load', () => {
    p.write(envJson(5, 100), { rotateBackup: true });
    st.failOn.add(KEYS.main);
    expect(p.write(envJson(6, 200), { rotateBackup: true })).toBe(false);
    expect(parseEnvelope(st.getItem(KEYS.main))?.data.level).toBe(5);
    expect(parseEnvelope(st.getItem(KEYS.tmp))?.data.level).toBe(6);
    const r = p.load();
    expect(r.source).toBe('tmp');
    expect(r.recovered).toBe(true);
    expect(r.state?.level).toBe(6);
  });

  it('recovers from the backup when main is corrupt', () => {
    p.write(envJson(7, 100), { rotateBackup: true });
    p.write(envJson(8, 200), { rotateBackup: true });
    st.setItem(KEYS.main, '{"v":3,"sum":1,"data":{"level":99');
    const r = p.load();
    expect(r.source).toBe('bak');
    expect(r.recovered).toBe(true);
    expect(r.state?.level).toBe(7);
  });

  it('prefers the newest valid copy', () => {
    st.setItem(KEYS.bak, envJson(1, 50));
    st.setItem(KEYS.main, envJson(2, 100));
    st.setItem(KEYS.tmp, envJson(3, 150));
    expect(p.load().state?.level).toBe(3);
    st.removeItem(KEYS.tmp);
    expect(p.load().state?.level).toBe(2);
  });

  it('migrates a legacy v2 blob when no v3 copy exists', () => {
    st.setItem(KEYS.v2, JSON.stringify({ level: 23, coins: 456, decor: ['plant'], stats: [{ n: 1 }] }));
    const r = p.load();
    expect(r.source).toBe('v2');
    expect(r.migratedFrom).toBe(2);
    expect(r.state?.level).toBe(23);
    expect(r.state?.coins).toBe(456);
    expect(r.state?.decor).toEqual(['plant']);
    expect(r.state?.stats.length).toBe(1);
  });

  it('migrates a legacy v1 blob when nothing newer exists, and v2 beats v1', () => {
    st.setItem(KEYS.v1, JSON.stringify({ level: 4, coins: 40, sound: false }));
    expect(p.load()).toMatchObject({ source: 'v1', migratedFrom: 1 });
    st.setItem(KEYS.v2, JSON.stringify({ level: 9, coins: 90, inv: {} }));
    expect(p.load()).toMatchObject({ source: 'v2', migratedFrom: 2 });
    expect(p.load().state?.level).toBe(9);
  });

  it('ignores corrupt legacy blobs', () => {
    st.setItem(KEYS.v2, '{not json');
    st.setItem(KEYS.v1, JSON.stringify({ level: 2 }));
    expect(p.load()).toMatchObject({ source: 'v1' });
  });

  it('clear removes every key', () => {
    p.write(envJson(1, 1), { rotateBackup: true });
    st.setItem(KEYS.v2, '{}');
    p.clear();
    for (const k of Object.values(KEYS)) expect(st.getItem(k)).toBeNull();
  });
});

/* ---------- manager ---------- */

describe('save manager', () => {
  let st: StorageLike;
  beforeEach(() => {
    st = new MemoryStorage();
    mgr.useLocalProvider(new LocalSaveProvider(st));
    Object.assign(mgr.S, defaultSave());
  });

  it('existing v2 players keep level, coins, decor, stats and boosters after the update', () => {
    st.setItem(
      KEYS.v2,
      JSON.stringify({
        level: 58,
        coins: 2150,
        decor: ['noren', 'lantern'],
        inv: { vip: 1, takeout: 0, sendback: 3 },
        stats: [{ n: 57, result: 'win' }],
        seenMech: ['wasabi', 'covered', 'vip', 'lock'],
        streak: 4,
      })
    );
    const info = mgr.load();
    expect(info.migratedFrom).toBe(2);
    expect(mgr.S.level).toBe(58);
    expect(mgr.S.coins).toBe(2150);
    expect(mgr.S.decor).toEqual(['noren', 'lantern']);
    expect(mgr.S.inv).toEqual({ vip: 1, takeout: 0, sendback: 3 });
    expect(mgr.S.stats.length).toBe(1);
    expect(mgr.S.seenMech).toEqual(['wasabi', 'covered', 'vip', 'lock']);
    expect(mgr.S.streak).toBe(4);
    expect(mgr.S.haptics).toBe(true);
    // A v3 primary copy now exists.
    expect(parseEnvelope(st.getItem(KEYS.main))?.data.level).toBe(58);
  });

  it('existing v1 players keep level and coins', () => {
    st.setItem(KEYS.v1, JSON.stringify({ level: 11, coins: 640, sound: true }));
    mgr.load();
    expect(mgr.S.level).toBe(11);
    expect(mgr.S.coins).toBe(640);
  });

  it('save skips unchanged state and writes when it changes', () => {
    mgr.S.coins = 50;
    expect(mgr.save()).toBe(true);
    const first = st.getItem(KEYS.main);
    expect(mgr.save()).toBe(true);
    expect(st.getItem(KEYS.main)).toBe(first);
    mgr.S.coins = 60;
    mgr.save();
    expect(st.getItem(KEYS.main)).not.toBe(first);
  });

  it('backup info and restore from backup', () => {
    mgr.S.level = 20;
    mgr.S.coins = 900;
    mgr.save();
    expect(mgr.rotateBackup()).toBe(true);
    mgr.S.coins = 1;
    mgr.S.level = 21;
    mgr.save();
    expect(mgr.backupInfo()).toMatchObject({ level: 20, coins: 900 });
    expect(mgr.restoreFromBackup()).toBe(true);
    expect(mgr.S.level).toBe(20);
    expect(mgr.S.coins).toBe(900);
    expect(parseEnvelope(st.getItem(KEYS.main))?.data.coins).toBe(900);
  });

  it('a corrupt main is recovered from the backup on load and rewritten', () => {
    mgr.S.level = 30;
    mgr.save();
    mgr.rotateBackup();
    st.setItem(KEYS.main, 'corrupt');
    mgr.useLocalProvider(new LocalSaveProvider(st));
    const info = mgr.load();
    expect(info.source).toBe('bak');
    expect(info.recovered).toBe(true);
    expect(mgr.S.level).toBe(30);
    expect(parseEnvelope(st.getItem(KEYS.main))?.data.level).toBe(30);
  });

  it('clearSave wipes everything', () => {
    mgr.S.level = 3;
    mgr.save();
    mgr.clearSave();
    expect(st.getItem(KEYS.main)).toBeNull();
    mgr.useLocalProvider(new LocalSaveProvider(st));
    expect(mgr.load().source).toBe('none');
  });
});

/* ---------- cloud stubs ---------- */

describe('cloud providers', () => {
  it('stubs are selected by platform and report unavailable', async () => {
    expect(cloudProviderFor('web')).toBeNull();
    const gc = cloudProviderFor('ios');
    const pg = cloudProviderFor('android');
    expect(gc).toBeInstanceOf(GameCenterSaveProvider);
    expect(pg).toBeInstanceOf(PlayGamesSaveProvider);
    for (const p of [gc, pg]) {
      expect(await p?.isAvailable()).toBe(false);
      expect(await p?.signIn()).toBe(false);
      expect(await p?.load()).toBeNull();
    }
  });

  it('manager cloud paths are no-ops while the provider is unavailable', async () => {
    mgr.useLocalProvider(new LocalSaveProvider(new MemoryStorage()));
    mgr.setCloudProvider(cloudProviderFor('ios'));
    expect(await mgr.pushToCloud()).toBe(false);
    expect(await mgr.restoreFromCloud()).toBe(false);
    mgr.setCloudProvider(null);
    expect(await mgr.pushToCloud()).toBe(false);
  });
});

/* Runtime rules: seating, the belt, grabbing, paying, deadlock, boosters and rescues.
   These functions mutate the current level in G.L and trigger presentation side effects (tweens, particles, sfx).
   Motion budget: every core action (tap answer, walk to seat, grab, pay) completes within 0.4 s. */

import { reducedMotion } from '../anim/motion';
import { particles } from '../anim/particles';
import { tweens } from '../anim/tween';
import { sfx } from '../audio/audio';
import { COIN_POS, COLORS, GRID, KITCHEN, SEAT_Y, W } from '../data/constants';
import { COST } from '../data/products';
import { t } from '../i18n';
import { S, save } from '../meta/save';
import { haptic } from '../platform/native';
import { BELT } from './belt';
import { DIR_DC, DIR_DR, getLevel, matchDP, pathLen, plateUnits } from './levels';
import { G, cur, setExpr, showAd, toast } from './state';
import type { BoosterKind, Diner, DinerDef, FailReason, Plate, PlateDef, PlateLike } from './types';
import { easeBack, easeIn, easeInOut, easeOut } from './util';

export function makeDiner(d: DinerDef, x: number, y: number): Diner {
  return {
    ...d,
    state: 'grid',
    x,
    y,
    hx: x,
    hy: y,
    pending: 0,
    alpha: 1,
    scale: 1,
    bump: 0,
    shake: 0,
    shakeX: 1,
    shakeY: 0,
    bumping: false,
    seat: -1,
    waitSince: 0,
    movable: false,
    expr: { type: 'idle', until: 0 },
    blinkAt: G.gt + 1 + Math.random() * 3,
    bubblePop: 0,
    paidT: -1,
    leaveT: 0,
    iceMax: d.ice,
    lean: 0,
    sx: 1,
    sy: 1,
  };
}

export function newLevel(n: number): void {
  const lv = getLevel(n, S.devAllMech),
    P = lv.P;
  const cell = Math.min(GRID.w / lv.cols, GRID.h / lv.rows);
  const gx = 240 - (lv.cols * cell) / 2,
    gy = GRID.y + (GRID.h - lv.rows * cell) / 2;
  const diners = lv.diners.map((d) => makeDiner(d, gx + (d.c + 0.5) * cell, gy + (d.r + 0.5) * cell));
  G.L = {
    n,
    lv,
    P,
    rows: lv.rows,
    cols: lv.cols,
    cell,
    gx,
    gy,
    diners,
    kitchen: lv.kitchen.map((p) => ({ ...p })),
    totalPlates: lv.kitchen.length,
    belt: [],
    seats: [],
    seatCount: P.seats,
    beltCap: P.beltCap,
    speed: P.speed,
    visibleNext: P.visibleNext,
    status: 'intro',
    introT: 0,
    elapsed: 0,
    sinceEmit: 0,
    steamT: 0,
    deadlock: 0,
    failT: 0,
    failReason: 'jam',
    failSlow: 0,
    vipUsed: false,
    armed: null,
    lastLeave: -9,
    combo: 0,
    earned: 0,
    streakBonus: 0,
    tension: 0,
    seatShake: 0,
    shake: 0,
    doneColors: new Set(),
    newMechs: lv.mechs.filter((m) => !S.seenMech.includes(m)),
    mechIdx: 0,
    plateId: 0,
    stat: {
      n,
      sched: P.tier,
      label: lv.tierLabel,
      diff: +lv.diff.toFixed(2),
      t0: performance.now(),
      taps: 0,
      boosters: 0,
      beltPeak: 0,
    },
  };
  tweens.clear();
  particles.clear();
  G.toasts = [];
  layoutSeats();
  if (n === 1) {
    if (S.tutorial >= 1) {
      toast(t('toast.tapRing'), 3.4, 1.5);
      toast(t('toast.grabColour'), 3.4, 5.2);
      toast(t('toast.watchKitchen'), 3.6, 9);
    }
  }
  if (n === 4) toast(t('toast.jamRule'), 3.6, 1.5);
}

export function layoutSeats(): void {
  const L = cur();
  const cnt = L.seatCount,
    left = 130,
    right = 350,
    old = L.seats;
  L.seats = Array.from({ length: cnt }, (_, i) => {
    const x = cnt === 1 ? 240 : left + ((right - left) * i) / (cnt - 1);
    return {
      x,
      y: SEAT_Y,
      t: BELT.tOfBottomX(x),
      diner: old[i] ? old[i].diner : null,
      press: old[i] ? old[i].press : 0,
    };
  });
  L.seats.forEach((s, i) => {
    if (s.diner) {
      s.diner.seat = i;
      if (s.diner.state === 'seated') tweens.to(s.diner, { x: s.x }, 0.3, { tag: 'shift' });
    }
  });
}

export function pathBlocked(d: Diner): boolean {
  const L = cur();
  const dr = DIR_DR[d.dir],
    dc = DIR_DC[d.dir];
  let r = d.r + dr,
    c = d.c + dc;
  while (r >= 0 && r < L.rows && c >= 0 && c < L.cols) {
    for (const o of L.diners) if (o.state === 'grid' && o.r === r && o.c === c) return true;
    r += dr;
    c += dc;
  }
  return false;
}

export function isLocked(d: Diner): boolean {
  return d.lockColor >= 0 && !cur().doneColors.has(d.lockColor);
}

export function canMove(d: Diner): boolean {
  return d.state === 'grid' && d.ice <= 0 && !isLocked(d) && !pathBlocked(d);
}

export function remaining(d: Diner): number {
  return d.need - d.pending;
}

export function canTake(d: Diner, p: Plate): boolean {
  return d.state === 'seated' && p.revealed !== false && matchDP(d, p, remaining(d));
}

/** Squash a diner and let it spring back. No-op under reduce motion. */
function squash(d: Diner, sx: number, sy: number, dur = 0.18): void {
  if (reducedMotion()) return;
  d.sx = sx;
  d.sy = sy;
  tweens.cancel(d, 'squash');
  tweens.to(d, { sx: 1, sy: 1 }, dur, { ease: easeBack, tag: 'squash' });
}

export function bumpInto(d: Diner): void {
  const L = cur();
  if (d.bumping) return;
  const dr = DIR_DR[d.dir],
    dc = DIR_DC[d.dir];
  let r = d.r + dr,
    c = d.c + dc,
    blocker: Diner | null = null;
  while (r >= 0 && r < L.rows && c >= 0 && c < L.cols && !blocker) {
    blocker = L.diners.find((o) => o.state === 'grid' && o.r === r && o.c === c) || null;
    r += dr;
    c += dc;
  }
  const gap = blocker ? Math.max(0, Math.hypot(blocker.hx - d.hx, blocker.hy - d.hy) - L.cell * 0.72) : L.cell * 0.25,
    travel = gap + L.cell * 0.1;
  d.bumping = true;
  sfx.swish();
  const stretch: Record<string, number> = reducedMotion()
    ? {}
    : { sx: 1 + Math.abs(dc) * 0.1, sy: 1 + Math.abs(dr) * 0.1 };
  tweens.to(d, { x: d.hx + dc * travel, y: d.hy + dr * travel, ...stretch }, 0.06 + (gap / L.cell) * 0.05, {
    ease: easeIn,
    tag: 'bump',
    onDone: () => {
      sfx.thud();
      if (blocker) {
        blocker.shake = 1;
        blocker.shakeX = dc;
        blocker.shakeY = dr;
        blocker.bump = 0.9;
        setExpr(blocker, 'grumpy', 1.2);
        squash(blocker, 1 - Math.abs(dc) * 0.14 + Math.abs(dr) * 0.1, 1 - Math.abs(dr) * 0.14 + Math.abs(dc) * 0.1);
        particles.emit('bonk', (d.x + blocker.x) / 2, (d.y + blocker.y) / 2, 1);
      }
      setExpr(d, 'grumpy', 0.8);
      tweens.to(d, { x: d.hx, y: d.hy, sx: 1, sy: 1 }, 0.24, {
        ease: easeOut,
        tag: 'bump',
        onDone: () => {
          d.bumping = false;
          d.x = d.hx;
          d.y = d.hy;
        },
      });
    },
  });
}

export function tryMove(d: Diner): void {
  const L = cur();
  if (d.state !== 'grid' || d.bumping) return;
  if (d.ice > 0) {
    d.ice--;
    d.shake = 0.7;
    d.shakeX = 1;
    d.shakeY = 0;
    sfx.crack();
    particles.emit('shard', d.x, d.y, 6);
    if (d.ice === 0) {
      sfx.chime();
      setExpr(d, 'happy', 1);
      squash(d, 1.12, 0.88);
    }
    return;
  }
  if (isLocked(d)) {
    d.shake = 0.7;
    d.shakeX = 1;
    d.shakeY = 0;
    sfx.locked();
    toast(t('toast.locked', { colour: t('colour.' + COLORS[d.lockColor].name.toLowerCase()).toLowerCase() }), 1.6);
    return;
  }
  if (pathBlocked(d)) {
    bumpInto(d);
    return;
  }
  const seat = L.seats.find((s) => !s.diner);
  if (!seat) {
    sfx.blocked();
    L.seatShake = 0.4;
    toast(t('toast.noSeat'), 1.6);
    return;
  }
  sfx.tap();
  haptic('light');
  setExpr(d, 'happy', 0.8);
  seat.diner = d;
  d.seat = L.seats.indexOf(seat);
  d.state = 'walking';
  const dx = DIR_DC[d.dir],
    dy = DIR_DR[d.dir];
  const ex = dx ? (dx > 0 ? L.gx + L.cols * L.cell + L.cell * 0.5 : L.gx - L.cell * 0.5) : d.x;
  const ey = dy ? (dy > 0 ? L.gy + L.rows * L.cell + L.cell * 0.5 : L.gy - L.cell * 0.5) : d.y;
  const exitDur = Math.min(0.13, 0.08 + 0.01 * pathLen(d.r, d.c, d.dir, L.rows, L.cols));
  const lean = dx * 0.16;
  const land = () => {
    const s = L.seats[d.seat];
    if (s) {
      d.x = s.x;
      d.y = s.y;
      s.press = 1;
    }
    d.state = 'seated';
    d.lean = 0;
    d.waitSince = L.elapsed;
    sfx.bell();
    squash(d, 1.16, 0.8);
  };
  tweens.cancel(d);
  if (reducedMotion()) {
    tweens.sequence(
      d,
      [
        { to: { x: ex, y: ey }, dur: exitDur, ease: easeIn },
        { to: { x: seat.x, y: seat.y }, dur: 0.2, ease: easeInOut },
      ],
      { tag: 'walk', onDone: land }
    );
    return;
  }
  // Anticipation (lean back, squat), launch (stretch), settle: 0.07 + <=0.13 + 0.2 = 0.4 s.
  tweens.sequence(
    d,
    [
      { to: { lean: -lean * 1.2, sx: 1.08, sy: 0.9 }, dur: 0.07, ease: easeOut },
      { to: { x: ex, y: ey, lean, sx: 0.96, sy: 1.06 }, dur: exitDur, ease: easeIn },
      { to: { x: seat.x, y: seat.y, lean: 0, sx: 1, sy: 1 }, dur: 0.2, ease: easeInOut },
    ],
    { tag: 'walk', onDone: land }
  );
}

export function crossed(a: number, b: number, s: number): boolean {
  return a <= b ? s > a && s <= b : s > a || s <= b;
}

export function entryClear(): boolean {
  return !cur().belt.some((p) => p.state === 'belt' && (p.t < 0.075 || p.t > 0.96));
}

export function updateBelt(dt: number): void {
  const L = cur();
  for (const p of L.belt) {
    if (p.state !== 'belt') continue;
    const prev = p.t;
    p.t = (p.t + L.speed * dt) % 1;
    if (p.covered && !p.revealed && prev > p.t) {
      p.revealed = true;
      sfx.reveal();
      particles.emit('puff', 240, 170, 1);
    }
    if (p.wasabi) {
      const before = p.timer;
      p.timer -= dt;
      if (p.timer <= 3 && Math.ceil(before) !== Math.ceil(p.timer)) sfx.tick();
      if (p.timer <= 0) {
        p.timer = 0;
        sfx.spoil();
        fail('wasabi');
        return;
      }
    }
    for (const s of L.seats) {
      const d = s.diner;
      if (!d || !canTake(d, p)) continue;
      if (crossed(prev, p.t, s.t)) {
        grab(p, d);
        break;
      }
    }
  }
  L.sinceEmit += dt;
  if (L.kitchen.length && L.belt.length < L.beltCap && L.sinceEmit >= 0.7 && entryClear()) {
    const tpl = L.kitchen.shift() as PlateDef;
    L.belt.push({
      ...tpl,
      t: 0,
      state: 'belt',
      x: 0,
      y: 0,
      s: 1,
      sx: 1,
      sy: 1,
      revealed: !tpl.covered,
      timer: tpl.wasabi ? 1.6 / L.speed : 0,
      id: L.plateId++,
    });
    L.sinceEmit = 0;
    particles.emit('steam', 240, 160, 2, { size: 3, life: 0.9 });
  }
  // Gentle steam over the kitchen window while there is food coming.
  L.steamT += dt;
  if (L.kitchen.length && L.steamT > 0.5) {
    L.steamT = 0;
    particles.emit('steam', KITCHEN.x + 24 + Math.random() * 80, KITCHEN.y + 34, 1, { size: 2.5, life: 1.2 });
  }
  L.stat.beltPeak = Math.max(L.stat.beltPeak, L.belt.length);
}

export function grab(p: Plate, d: Diner): void {
  const L = cur();
  const units = plateUnits(p);
  p.state = 'grab';
  d.pending += units;
  const from = BELT.pointAt(p.t);
  p.x = from.x;
  p.y = from.y;
  p.arc = { x0: from.x, y0: from.y, x1: d.x, y1: d.y - 8, u: 0 };
  sfx.pop();
  haptic('medium');
  const remove = () => {
    const i = L.belt.indexOf(p);
    if (i >= 0) L.belt.splice(i, 1);
  };
  tweens.to(p.arc, { u: 1 }, 0.28, {
    ease: easeIn,
    tag: 'arc',
    onDone: () => {
      d.pending -= units;
      d.need -= units;
      d.bump = 1;
      d.bubblePop = 1;
      d.waitSince = L.elapsed;
      sfx.chew();
      setExpr(d, 'chew', 0.38);
      particles.emit('crumb', d.x, d.y + 4, 4, { color: COLORS[p.color].hex });
      if (reducedMotion()) remove();
      else {
        // Landing squash: the plate flattens for a tenth of a second before it is eaten.
        p.state = 'landed';
        p.sx = 1.35;
        p.sy = 0.65;
        tweens.to(p, { sx: 1, sy: 1 }, 0.1, { ease: easeOut, tag: 'land', onDone: remove });
        squash(d, 1.1, 0.92, 0.14);
      }
      if (d.need <= 0 && d.state === 'seated') pay(d);
    },
  });
}

export function pay(d: Diner): void {
  const L = cur();
  d.state = 'paying';
  d.paidT = 0;
  const seat = L.seats[d.seat];
  if (seat && seat.diner === d) seat.diner = null;
  setExpr(d, 'happy', 2);
  sfx.stamp();
  tweens.delay(0.22, () => {
    if (G.L && G.L.diners.includes(d)) sfx.cash();
  });
  addCoins(2, d.x, d.y - 30);
  if (L.elapsed - L.lastLeave < 2.5) {
    L.combo++;
    toast(t('toast.combo', { n: L.combo + 1 }), 1.4);
    addCoins(5, d.x, d.y - 50);
  } else L.combo = 0;
  L.lastLeave = L.elapsed;
  tweens.delay(0.35, () => {
    d.state = 'leaving';
    d.leaveT = 0;
    L.doneColors.add(d.color);
    for (const o of L.diners)
      if (o.state === 'grid' && o.lockColor === d.color) {
        o.shake = 0.6;
        o.shakeX = 1;
        o.shakeY = 0;
        setExpr(o, 'happy', 1.2);
        particles.emit('spark', o.x, o.y - L.cell * 0.2, 1);
      }
    if (L.diners.some((o) => o.state === 'grid' && o.lockColor === d.color)) sfx.chime();
    tweens.to(d, { x: d.x < 240 ? -50 : W + 50 }, 0.4, {
      ease: easeIn,
      tag: 'leave',
      onDone: () => {
        d.state = 'done';
      },
    });
  });
}

/** Coins fly to the counter; each one credits its share on arrival, and the save happens once they all land. */
export function addCoins(n: number, x: number, y: number): void {
  const target = S.leftHanded ? W - COIN_POS.x : COIN_POS.x;
  particles.coins(
    n,
    x,
    y,
    (value) => {
      S.coins += value;
      G.coinPop = 1;
      sfx.coin();
      if (particles.countOf('coin') === 0) save();
    },
    target
  );
}

export function checkDeadlock(dt: number): void {
  const L = cur();
  const free = L.seats.some((s) => !s.diner);
  const busy =
    L.diners.some((d) => d.state === 'walking' || d.state === 'paying' || d.state === 'leaving') ||
    L.belt.some((p) => p.state !== 'belt');
  if (free || busy) {
    L.deadlock = 0;
    return;
  }
  if (L.belt.some((p) => L.seats.some((s) => s.diner && canTake(s.diner, p)))) {
    L.deadlock = 0;
    return;
  }
  if (L.belt.some((p) => p.covered && !p.revealed)) {
    L.deadlock = 0;
    return;
  }
  if (L.kitchen.length > 0 && L.belt.length < L.beltCap) {
    L.deadlock = 0;
    return;
  }
  L.deadlock += dt;
  if (L.deadlock > 0.8) fail('jam');
}

export function fail(reason: FailReason): void {
  const L = cur();
  if (L.status !== 'play') return;
  L.status = 'failing';
  L.failReason = reason;
  L.failSlow = 0.55;
  L.shake = reducedMotion() ? 0 : 1;
  L.armed = null;
  S.streak = 0;
  sfx.fail();
  haptic('heavy');
  L.stat.fails = (L.stat.fails || 0) + 1;
  logStat('fail');
  save();
}

export function win(): void {
  const L = cur();
  if (L.status !== 'play') return;
  L.status = 'win';
  L.armed = null;
  S.streak++;
  const sb = Math.min(50, (S.streak - 1) * 10);
  L.earned = 50 + L.n * 2 + sb;
  L.streakBonus = sb;
  S.coins += L.earned;
  G.coinPop = 1;
  S.level = Math.max(S.level, L.n + 1);
  S.best = Math.max(S.best, S.level);
  S.weekly = (S.weekly || 0) + 1;
  logStat('win');
  save();
  sfx.win();
  haptic('success');
  particles.emit('confetti', 0, 0, 70);
}

export function logStat(result: string): void {
  const st = cur().stat;
  const rec = {
    n: st.n,
    sched: st.sched,
    label: st.label,
    diff: st.diff,
    time: +((performance.now() - st.t0) / 1000).toFixed(1),
    taps: st.taps,
    boosters: st.boosters,
    beltPeak: st.beltPeak,
    result,
    ts: Date.now(),
  };
  S.stats.push(rec);
  if (S.stats.length > 500) S.stats.splice(0, S.stats.length - 500);
  st.t0 = performance.now();
  st.taps = 0;
  st.boosters = 0;
  st.beltPeak = 0;
}

const sameOrder = (d: Diner, p: PlateLike) => p.color === d.color && !!p.vip === !!d.vip;

/** Serve a seated diner instantly: remove their plates from the belt and kitchen, then pay. */
export function takeout(d: Diner): void {
  const L = cur();
  let need = remaining(d);
  for (const p of L.belt.slice()) {
    if (need <= 0) break;
    if (p.state === 'belt' && sameOrder(d, p) && plateUnits(p) <= need) {
      L.belt.splice(L.belt.indexOf(p), 1);
      need -= plateUnits(p);
    }
  }
  for (let i = 0; i < L.kitchen.length && need > 0;) {
    const p = L.kitchen[i];
    if (sameOrder(d, p) && plateUnits(p) <= need) {
      L.kitchen.splice(i, 1);
      need -= plateUnits(p);
    } else i++;
  }
  d.need = d.pending;
  if (d.pending === 0 && d.state === 'seated') pay(d);
}

function toKitchen(p: Plate): PlateDef {
  return { color: p.color, vip: p.vip, double: p.double, wasabi: p.wasabi, covered: p.covered };
}

export function clearBeltToKitchen(): void {
  const L = cur();
  for (const p of L.belt.slice()) {
    if (p.state !== 'belt') continue;
    const wanted = L.seats.some(
      (s) => s.diner && s.diner.state === 'seated' && matchDP(s.diner, p, remaining(s.diner))
    );
    if (!wanted || (p.wasabi && p.timer <= 0)) {
      L.belt.splice(L.belt.indexOf(p), 1);
      L.kitchen.push(toKitchen(p));
    }
  }
}

function seatedByNeed(): Diner[] {
  return cur()
    .seats.filter((s) => s.diner && s.diner.state === 'seated')
    .map((s) => s.diner as Diner)
    .sort((a, b) => b.need - a.need);
}

export function rescueCore(full: boolean): void {
  const L = cur();
  if (L.seatCount < 5) {
    L.seatCount = 5;
    L.vipUsed = true;
    layoutSeats();
  } else if (!full) {
    const seated = seatedByNeed();
    if (seated[0]) takeout(seated[0]);
  }
  if (full) {
    const seated = seatedByNeed();
    if (seated[0]) takeout(seated[0]);
  }
  clearBeltToKitchen();
  L.status = 'play';
  L.deadlock = 0;
  L.shake = 0;
}

export function adRescue(): void {
  showAd('reward', () => {
    rescueCore(false);
    sfx.boost();
    toast(t('toast.freeSeat'), 2);
  });
}

export function paidRescue(): void {
  rescueCore(true);
  S.coins += 200;
  G.coinPop = 1;
  save();
  sfx.boost();
  toast(t('toast.rescue'), 2.4);
}

export function useBooster(kind: BoosterKind): void {
  const L = cur();
  if (L.status !== 'play') return;
  if (L.armed === kind) {
    L.armed = null;
    return;
  }
  const haveInv = S.inv[kind] > 0,
    cost = COST[kind];
  if (kind === 'vip') {
    if (L.vipUsed) {
      toast(t('toast.vipAlready'), 1.5);
      return;
    }
    if (!haveInv && S.coins < cost) {
      toast(t('toast.noCoinsVip'), 1.5);
      sfx.blocked();
      return;
    }
    if (haveInv) S.inv.vip--;
    else S.coins -= cost;
    save();
    L.seatCount = 5;
    L.vipUsed = true;
    layoutSeats();
    sfx.boost();
    L.stat.boosters++;
    toast(t('toast.vipOpened'), 1.5);
    return;
  }
  if (!haveInv && S.coins < cost) {
    toast(t('toast.noCoins'), 1.5);
    sfx.blocked();
    return;
  }
  L.armed = kind;
  sfx.tap();
}

export function spendBooster(kind: BoosterKind): void {
  if (S.inv[kind] > 0) S.inv[kind]--;
  else S.coins -= COST[kind];
  cur().stat.boosters++;
  save();
}

export function handleArmed(x: number, y: number): void {
  const L = cur();
  const kind = L.armed;
  L.armed = null;
  if (kind === 'takeout') {
    const s = L.seats.find(
      (s) => s.diner && s.diner.state === 'seated' && Math.hypot(s.diner.x - x, s.diner.y - y) < 34
    );
    if (!s) {
      toast(t('toast.cancelled'), 1);
      return;
    }
    spendBooster('takeout');
    sfx.boost();
    toast(t('toast.takeout'), 1.5);
    takeout(s.diner as Diner);
  } else if (kind === 'sendback') {
    let best: Plate | null = null,
      bd = 26;
    for (const p of L.belt) {
      if (p.state !== 'belt') continue;
      const q = BELT.pointAt(p.t);
      const dd = Math.hypot(q.x - x, q.y - y);
      if (dd < bd) {
        bd = dd;
        best = p;
      }
    }
    if (!best) {
      toast(t('toast.cancelled'), 1);
      return;
    }
    spendBooster('sendback');
    sfx.boost();
    L.belt.splice(L.belt.indexOf(best), 1);
    L.kitchen.push(toKitchen(best));
    toast(t('toast.sentBack'), 1.5);
  }
}

export function hitGridDiner(x: number, y: number): Diner | null {
  const L = cur();
  let best: Diner | null = null,
    bd = L.cell * 0.5;
  for (const d of L.diners) {
    if (d.state !== 'grid') continue;
    const dd = Math.hypot(d.x - x, d.y - y);
    if (dd < bd) {
      bd = dd;
      best = d;
    }
  }
  return best;
}

export function nextMechCard(): void {
  const L = cur();
  L.mechIdx++;
  if (L.mechIdx >= L.newMechs.length) {
    for (const m of L.newMechs) if (!S.seenMech.includes(m)) S.seenMech.push(m);
    save();
    L.status = 'play';
  }
}

/** One step of the automated player used by the dev API and the smoke test. */
export function devAuto(): boolean {
  const L = G.L;
  if (!L || L.status !== 'play' || G.screen) return false;
  if (L.armed) L.armed = null;
  if (!L.seats.some((s) => !s.diner)) return false;
  const movable = L.diners.filter((d) => d.state === 'grid' && !d.bumping && !isLocked(d) && !pathBlocked(d));
  if (!movable.length) return false;
  const wanted: PlateLike[] = [
    ...L.belt.filter((p) => p.state === 'belt' && p.revealed !== false),
    ...L.kitchen.slice(0, L.visibleNext),
  ];
  let pick: Diner | undefined;
  for (const p of wanted) {
    pick = movable.find((d) => d.ice <= 0 && matchDP(d, p, d.need));
    if (pick) break;
  }
  if (!pick) pick = movable.find((d) => d.ice > 0) || movable[0];
  tryMove(pick);
  return true;
}

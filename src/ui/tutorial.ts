/* Guided first session: levels 1 to 3. One instruction at a time, a dimmed board with a hole around the
   target, and a hand pointer. Guided steps only accept a tap on their target; info steps advance on any tap
   or a short timeout. Progress is saved per level in S.tutorial. */

import { sprite } from '../art/svg';
import { KITCHEN, SEAT_Y } from '../data/constants';
import { matchDP } from '../engine/levels';
import { canMove, pathBlocked, tryMove } from '../engine/rules';
import { cur, G } from '../engine/state';
import type { Diner } from '../engine/types';
import { t } from '../i18n';
import { S, save } from '../meta/save';
import { ctx } from '../render/canvas';
import { rrect, textW, txt } from '../render/primitives';
import { button } from './buttons';

export interface Target {
  x: number;
  y: number;
  r: number;
  diner?: Diner;
}

interface Step {
  key: string;
  /** Guided steps return the diner (or spot) the player must tap; info steps return a spot to point at. */
  target: () => Target | null;
  /** Guided: the tap must hit the target. Info: any tap (or the timeout) moves on. */
  guided: boolean;
  timeout?: number;
  done: () => boolean;
  /** Info steps can wait for a condition before they show. */
  when?: () => boolean;
}

interface State {
  level: number;
  idx: number;
  t: number;
  startNeed: number;
  moved: number;
}

const st: State = { level: 0, idx: 0, t: 0, startNeed: 0, moved: 0 };

function dinerTarget(d: Diner): Target {
  return { x: d.x, y: d.y, r: cur().cell * 0.55, diner: d };
}

/** The movable diner whose colour matches the next plate, like the autoplayer picks. */
function bestDiner(): Diner | null {
  const L = cur();
  const movable = L.diners.filter((d) => canMove(d) && !d.bumping);
  if (!movable.length) return null;
  const wanted = [...L.belt.filter((p) => p.state === 'belt' && p.revealed !== false), ...L.kitchen.slice(0, 3)];
  for (const p of wanted) {
    const d = movable.find((m) => matchDP(m, p, m.need));
    if (d) return d;
  }
  return movable[0];
}

function seatedDiner(): Diner | null {
  const L = cur();
  const s = L.seats.find((s) => s.diner && (s.diner.state === 'seated' || s.diner.state === 'walking'));
  return s ? s.diner : null;
}

const kitchenSpot = (): Target => ({ x: KITCHEN.x + KITCHEN.w / 2, y: KITCHEN.y + KITCHEN.h / 2, r: 130 });
const seatsSpot = (): Target => ({ x: 240, y: SEAT_Y, r: 150 });
const movedCount = () => cur().diners.filter((d) => d.state !== 'grid').length;

const STEPS: Record<number, Step[]> = {
  1: [
    {
      key: 'tutorial.tapDiner',
      guided: true,
      target: () => {
        const d = bestDiner();
        return d ? dinerTarget(d) : null;
      },
      done: () => movedCount() >= 1,
    },
    { key: 'tutorial.kitchen', guided: false, timeout: 2.2, target: kitchenSpot, done: () => false },
    {
      key: 'tutorial.grab',
      guided: false,
      timeout: 5,
      target: () => {
        const d = seatedDiner();
        return d ? { x: d.x, y: d.y, r: 60, diner: d } : seatsSpot();
      },
      done: () => {
        const d = seatedDiner();
        return !!d && d.need < st.startNeed;
      },
    },
    {
      key: 'tutorial.matchNext',
      guided: true,
      target: () => {
        const d = bestDiner();
        return d ? dinerTarget(d) : null;
      },
      done: () => movedCount() >= 2,
    },
    {
      key: 'tutorial.seatAll',
      guided: false,
      target: () => {
        const d = bestDiner();
        return d ? dinerTarget(d) : null;
      },
      done: () => cur().status === 'win',
    },
  ],
  2: [
    {
      key: 'tutorial.blocked',
      guided: false,
      timeout: 3,
      target: () => {
        const d = cur().diners.find((d) => d.state === 'grid' && pathBlocked(d));
        return d ? dinerTarget(d) : null;
      },
      done: () => false,
    },
    { key: 'tutorial.readKitchen', guided: false, timeout: 2.2, target: kitchenSpot, done: () => false },
  ],
  3: [
    {
      key: 'tutorial.keepSeat',
      guided: false,
      timeout: 4,
      when: () => cur().seats.filter((s) => s.diner).length >= 2 || cur().elapsed > 8,
      target: seatsSpot,
      done: () => false,
    },
  ],
};

/** True while a tutorial step is on screen for the current level. */
export function tutorialActive(): boolean {
  const L = G.L;
  if (!L || L.status !== 'play' || G.screen) return false;
  if (L.n > 3 || S.tutorial >= L.n) return false;
  if (st.level !== L.n) {
    st.level = L.n;
    st.idx = 0;
    st.t = 0;
    st.moved = 0;
    st.startNeed = 0;
  }
  const steps = STEPS[L.n];
  return !!steps && st.idx < steps.length;
}

function current(): Step | null {
  if (!tutorialActive()) return null;
  const step = STEPS[st.level][st.idx];
  if (step.when && !step.when()) return null;
  return step;
}

function advance(): void {
  const steps = STEPS[st.level];
  st.idx++;
  st.t = 0;
  const d = seatedDiner();
  st.startNeed = d ? d.need : 0;
  if (st.idx >= steps.length) finishLevel();
}

function finishLevel(): void {
  if (S.tutorial < st.level) {
    S.tutorial = st.level;
    save();
  }
}

export function skipTutorial(): void {
  S.tutorial = 3;
  save();
}

export function resetTutorial(): void {
  S.tutorial = 0;
  st.level = 0;
  save();
}

/** Per frame: time out info steps, complete steps whose condition is met, finish level 1 on win. */
export function updateTutorial(dt: number): void {
  const L = G.L;
  if (!L || L.n > 3 || S.tutorial >= L.n) return;
  if (L.status === 'win') {
    // The level is cleared: whatever step was showing, this level's tutorial is done.
    S.tutorial = L.n;
    save();
    return;
  }
  const step = current();
  if (!step) return;
  st.t += dt;
  if (step.done()) advance();
  else if (!step.guided && step.timeout && st.t > step.timeout) advance();
}

/** Input gate. Returns true when the tap was consumed by the tutorial. */
export function tutorialTap(x: number, y: number): boolean {
  const step = current();
  if (!step) return false;
  const target = step.target();
  if (step.guided) {
    if (target && target.diner && Math.hypot(target.x - x, target.y - y) <= target.r) {
      tryMove(target.diner);
      return true;
    }
    return true; // anything else is ignored while a guided step is up
  }
  if (step.key === 'tutorial.seatAll') return false; // free play with a hint: normal input
  advance();
  return true;
}

/** Where the hand points right now, for the smoke test's naive player. Null when no step is showing. */
export function tutorialTarget(): { x: number; y: number; guided: boolean; key: string } | null {
  const step = current();
  if (!step) return null;
  const tg = step.target();
  return tg
    ? { x: tg.x, y: tg.y, guided: step.guided, key: step.key }
    : { x: 240, y: 300, guided: false, key: step.key };
}

export function tutorialStep(): string | null {
  const step = current();
  return step ? step.key : null;
}

const HAND =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">' +
  '<path d="M24 60 L18 40 Q14 30 22 30 L24 30 L24 12 Q24 6 30 6 Q36 6 36 12 L36 28 L46 30 Q56 32 56 42 L54 56 Q53 60 48 60 Z" fill="#FFF7E8" stroke="#2A2320" stroke-width="3.5" stroke-linejoin="round"/>' +
  '<path d="M36 28 L36 20 M43 30 L43 22 M50 33 L50 26" fill="none" stroke="#2A2320" stroke-width="3" stroke-linecap="round"/>' +
  '</svg>';

export function drawTutorial(): void {
  const step = current();
  if (!step) return;
  const tg = step.target();
  const seatAll = step.key === 'tutorial.seatAll';
  // Dim everything except a hole around the target (info hint during free play: no dim, just the hand).
  if (!seatAll) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,15,10,.55)';
    ctx.beginPath();
    ctx.rect(0, 0, 480, 900);
    if (tg) ctx.arc(tg.x, tg.y, tg.r, 0, Math.PI * 2, true);
    ctx.fill('evenodd');
    ctx.restore();
  }
  if (tg) {
    // Pulsing ring around the target.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,247,232,.95)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(tg.x, tg.y, tg.r + Math.sin(G.gt * 5) * 3, 0, 7);
    ctx.stroke();
    ctx.restore();
    // Hand pointer bobbing toward the target from the lower right.
    const hand = sprite('hand', () => HAND, 64, 64);
    const bob = Math.sin(G.gt * 4) * 6;
    if (hand) ctx.drawImage(hand, tg.x + 8 + bob, tg.y + 10 + bob, 64, 64);
  }
  // One line of instruction in a pill, above or below the target so it never covers it.
  const text = t(step.key);
  const size = textW(text, 16, 800) > 380 ? 13 : 16;
  const w = Math.min(440, textW(text, size, 800) + 36);
  const y = tg && tg.y < 450 ? Math.min(820, tg.y + tg.r + 44) : tg ? tg.y - tg.r - 40 : 300;
  ctx.save();
  ctx.fillStyle = '#FFF9EE';
  rrect(240 - w / 2, y - 22, w, 44, 14);
  ctx.fill();
  ctx.strokeStyle = '#2A2320';
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(text, 240, y + 1, size, 800, '#2A2320', 'center', 'middle');
  ctx.restore();
  button(W_SKIP.x, W_SKIP.y, W_SKIP.w, W_SKIP.h, t('tutorial.skip'), null, {
    tone: 'rgba(42,35,32,.75)',
    size: 12,
    onTap: () => skipTutorial(),
  });
}

const W_SKIP = { x: 350, y: 156, w: 120, h: 30 };

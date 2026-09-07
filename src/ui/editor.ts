/* In-browser level editor, reachable from the dev panel only. Paint diners, set the kitchen by hand or from
   the solution, measure the fail rate live, import/export the JSON stored in /levels, and play-test. */

import { sfx } from '../audio/audio';
import { COLORS } from '../data/constants';
import { AUTHORED_LEVELS } from '../data/levels';
import {
  dinersFromCells,
  formatCell,
  formatCells,
  formatKitchen,
  kitchenFromSolution,
  levelFromJson,
  mechsOf,
  parseCellToken,
  parseCells,
  parseKitchen,
  validateLevel,
  type AuthoredCell,
  type LevelJson,
  type Validation,
} from '../engine/authored';
import { beatFor } from '../engine/author';
import { makeGenerated, paramsFor, tierFromDiff } from '../engine/levels';
import { rng } from '../engine/rng';
import { newLevelDef } from '../engine/rules';
import { G, toast } from '../engine/state';
import type { LevelDef, LevelLike, PlateDef } from '../engine/types';
import { t } from '../i18n';
import { ctx } from '../render/canvas';
import { card, glyph, rrect, txt } from '../render/primitives';
import { button, closeBtn } from './buttons';

type Tool = 'paint' | 'erase' | 'rotate' | 'need' | 'vip' | 'lock' | 'ice';

interface EditorState {
  n: number;
  rows: number;
  cols: number;
  colors: number;
  seats: number;
  beltCap: number;
  visibleNext: number;
  cells: AuthoredCell[];
  /** null: the kitchen is generated from the solution order with the level's seed. */
  kitchen: PlateDef[] | null;
  seed: number;
  brush: { color: number; dir: number; need: number };
  tool: Tool;
  sel: number;
  result: Validation | null;
}

const ed: EditorState = {
  n: 1,
  rows: 4,
  cols: 4,
  colors: 4,
  seats: 4,
  beltCap: 8,
  visibleNext: 3,
  cells: [],
  kitchen: null,
  seed: 1,
  brush: { color: 0, dir: 2, need: 2 },
  tool: 'paint',
  sel: 0,
  result: null,
};

const DIR_ARROW = ['↑', '→', '↓', '←'];

export function openEditor(n?: number): void {
  if (n !== undefined) loadLevel(n);
  G.screen = { type: 'editor', t: 0 };
}

/** Load the authored JSON for n, or the generated level as a starting point. */
export function loadLevel(n: number): void {
  const j = AUTHORED_LEVELS.get(n);
  if (j) {
    fromJson(j);
    return;
  }
  const lv = makeGenerated(n);
  ed.n = n;
  ed.rows = lv.rows;
  ed.cols = lv.cols;
  ed.colors = lv.P.colors;
  ed.seats = lv.P.seats;
  ed.beltCap = lv.P.beltCap;
  ed.visibleNext = lv.P.visibleNext;
  ed.seed = lv.seed;
  ed.cells = lv.diners.map((d) => ({
    r: d.r,
    c: d.c,
    dir: d.dir,
    color: d.color,
    need: d.need,
    vip: d.vip,
    lockColor: d.lockColor,
    ice: d.ice,
  }));
  ed.kitchen = lv.kitchen.map((p) => ({ ...p }));
  ed.result = null;
}

export function fromJson(j: LevelJson): void {
  const parsed = parseCells(j.cells);
  const base = paramsFor(j.n);
  ed.n = j.n;
  ed.rows = j.rows;
  ed.cols = j.cols;
  ed.colors = j.colors;
  ed.seats = j.seats ?? base.seats;
  ed.beltCap = j.beltCap ?? base.beltCap;
  ed.visibleNext = j.visibleNext ?? base.visibleNext;
  ed.seed = (j.seed ?? j.n * 7919 + 991) >>> 0;
  ed.cells = parsed.cells;
  ed.kitchen = j.kitchen ? parseKitchen(j.kitchen) : null;
  ed.result = null;
}

export function toJson(): LevelJson {
  const lv = currentLevel();
  const beat = beatFor(ed.n);
  return {
    n: ed.n,
    beat: beat.intro ? 'intro:' + beat.intro : beat.kind,
    band: beat.band,
    rows: ed.rows,
    cols: ed.cols,
    colors: ed.colors,
    seats: ed.seats,
    beltCap: ed.beltCap,
    visibleNext: ed.visibleNext,
    cells: formatCells(ed.cells, ed.rows, ed.cols),
    kitchen: lv ? formatKitchen(lv.kitchen) : '',
    seed: ed.seed,
    diff: ed.result && ed.result.ok ? +ed.result.diff.toFixed(3) : undefined,
  };
}

/** The level as it stands. Null when the board cannot be peeled. */
export function currentLevel(): LevelLike | null {
  const diners = dinersFromCells(ed.cells, ed.rows, ed.cols);
  if (!diners) return null;
  const P = {
    ...paramsFor(ed.n),
    rows: ed.rows,
    cols: ed.cols,
    colors: ed.colors,
    seats: ed.seats,
    beltCap: ed.beltCap,
    visibleNext: ed.visibleNext,
  };
  const kitchen = ed.kitchen ? ed.kitchen.map((p) => ({ ...p })) : kitchenFromSolution(diners, ed.seats, rng(ed.seed));
  return { P, rows: ed.rows, cols: ed.cols, diners, kitchen, seed: ed.seed };
}

export function solve(runs = 200): Validation {
  const lv = currentLevel();
  ed.result = lv
    ? validateLevel(lv, runs)
    : { ok: false, problems: ['board cannot be peeled'], diff: 1, tier: 'Super Hard' }; // i18n-ignore
  return ed.result;
}

export function generateKitchen(): void {
  const lv = currentLevel();
  if (!lv) return;
  ed.kitchen = null;
  ed.result = null;
}

export function playTest(): boolean {
  const lv = currentLevel();
  if (!lv) return false;
  const v = ed.result || solve(40);
  const def: LevelDef = {
    ...lv,
    n: ed.n,
    diff: v.diff,
    tierLabel: tierFromDiff(v.diff),
    mechs: mechsOf(lv),
    authored: true,
  };
  G.screen = null;
  newLevelDef(def);
  return true;
}

export function paintToken(r: number, c: number, token: string | null): void {
  ed.cells = ed.cells.filter((x) => !(x.r === r && x.c === c));
  if (token) {
    const p = parseCellToken(token);
    if (p) ed.cells.push({ r, c, ...p });
  }
  ed.result = null;
}

function cellAt(r: number, c: number): AuthoredCell | undefined {
  return ed.cells.find((x) => x.r === r && x.c === c);
}

function applyTool(r: number, c: number): void {
  const cell = cellAt(r, c);
  switch (ed.tool) {
    case 'paint':
      if (cell) {
        cell.color = ed.brush.color;
        cell.dir = ed.brush.dir;
        cell.need = ed.brush.need;
      } else
        ed.cells.push({
          r,
          c,
          color: ed.brush.color,
          dir: ed.brush.dir,
          need: ed.brush.need,
          vip: false,
          lockColor: -1,
          ice: 0,
        });
      break;
    case 'erase':
      ed.cells = ed.cells.filter((x) => x !== cell);
      break;
    case 'rotate':
      if (cell) cell.dir = (cell.dir + 1) % 4;
      break;
    case 'need':
      if (cell) cell.need = (cell.need % 5) + 1;
      break;
    case 'vip':
      if (cell) cell.vip = !cell.vip;
      break;
    case 'lock':
      if (cell) cell.lockColor = cell.lockColor + 1 >= ed.colors ? -1 : cell.lockColor + 1;
      break;
    case 'ice':
      if (cell) cell.ice = (cell.ice + 1) % 4;
      break;
  }
  ed.result = null;
}

function clampCells(): void {
  ed.cells = ed.cells.filter((x) => x.r < ed.rows && x.c < ed.cols);
  for (const x of ed.cells) {
    if (x.color >= ed.colors) x.color = ed.colors - 1;
    if (x.lockColor >= ed.colors) x.lockColor = -1;
  }
  if (ed.kitchen) for (const p of ed.kitchen) if (p.color >= ed.colors) p.color = ed.colors - 1;
  ed.result = null;
}

/* ---------- drawing ---------- */

function stepper(x: number, y: number, label: string, value: number, onDelta: (d: number) => void): void {
  txt(label, x, y + 1, 12, 800, '#5A4E45', 'left', 'middle');
  const vx = x + 52;
  button(vx, y - 13, 24, 26, '−', null, { tone: '#4A4540', size: 14, onTap: () => onDelta(-1) });
  txt(String(value), vx + 40, y + 1, 15, 800, '#2A2320', 'center', 'middle');
  button(vx + 56, y - 13, 24, 26, '+', null, { tone: '#4A4540', size: 14, onTap: () => onDelta(1) });
}

function chip(
  x: number,
  y: number,
  w: number,
  label: string,
  active: boolean,
  onTap: () => void,
  tone = '#6A4C93'
): void {
  button(x, y, w, 26, label, null, { tone: active ? tone : '#B9B2A5', size: 12, onTap });
}

function drawCellDiner(x: number, y: number, size: number, cell: AuthoredCell): void {
  const col = COLORS[cell.color] || COLORS[0];
  const r = size * 0.36;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = col.hex;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, 7);
  ctx.fill();
  if (cell.vip) {
    ctx.strokeStyle = '#F2B705';
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  if (cell.ice > 0) {
    ctx.fillStyle = 'rgba(160,215,255,.6)';
    rrect(-r * 1.05, -r * 1.05, r * 2.1, r * 2.1, r * 0.3);
    ctx.fill();
  }
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(-r * 0.62, -r * 0.62, r * 0.32, 0, 7);
  ctx.fill();
  glyph(-r * 0.62, -r * 0.62, col.glyph, r * 0.4, col.hex);
  txt(DIR_ARROW[cell.dir], 0, -r * 0.05, r * 0.9, 800, '#fff', 'center', 'middle');
  ctx.fillStyle = '#2A2320';
  ctx.beginPath();
  ctx.arc(r * 0.62, r * 0.62, r * 0.34, 0, 7);
  ctx.fill();
  txt(cell.need, r * 0.62, r * 0.66, r * 0.58, 800, '#fff', 'center', 'middle');
  if (cell.lockColor >= 0) {
    ctx.fillStyle = 'rgba(42,35,32,.9)';
    rrect(-r * 0.5, -r * 1.3, r, r * 0.55, r * 0.1);
    ctx.fill();
    glyph(0, -r * 1.02, COLORS[cell.lockColor].glyph, r * 0.36, COLORS[cell.lockColor].hex);
  }
  if (cell.ice > 0) txt('I' + cell.ice, -r * 0.6, r * 0.7, r * 0.5, 800, '#1C5D8A', 'center', 'middle'); // i18n-ignore
  ctx.restore();
}

function drawGridArea(): void {
  const top = 236,
    height = 284;
  const cell = Math.min(420 / ed.cols, height / ed.rows);
  const gx = 240 - (ed.cols * cell) / 2,
    gy = top + (height - ed.rows * cell) / 2;
  ctx.fillStyle = '#E4D6B4';
  rrect(gx - 6, gy - 6, ed.cols * cell + 12, ed.rows * cell + 12, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,95,60,.25)';
  ctx.lineWidth = 1;
  for (let c = 1; c < ed.cols; c++) {
    ctx.beginPath();
    ctx.moveTo(gx + c * cell, gy);
    ctx.lineTo(gx + c * cell, gy + ed.rows * cell);
    ctx.stroke();
  }
  for (let r = 1; r < ed.rows; r++) {
    ctx.beginPath();
    ctx.moveTo(gx, gy + r * cell);
    ctx.lineTo(gx + ed.cols * cell, gy + r * cell);
    ctx.stroke();
  }
  for (let r = 0; r < ed.rows; r++)
    for (let c = 0; c < ed.cols; c++) {
      const x = gx + (c + 0.5) * cell,
        y = gy + (r + 0.5) * cell;
      const cellDef = cellAt(r, c);
      if (cellDef) drawCellDiner(x, y, cell, cellDef);
      G.buttons.push({ x: gx + c * cell, y: gy + r * cell, w: cell, h: cell, onTap: () => applyTool(r, c) });
    }
}

function drawPalette(): void {
  const y = 534;
  for (let i = 0; i < ed.colors; i++) {
    const x = 40 + i * 34;
    G.buttons.push({
      x,
      y,
      w: 30,
      h: 30,
      onTap: () => {
        ed.brush.color = i;
        if (ed.kitchen && ed.sel < ed.kitchen.length) {
          ed.kitchen[ed.sel].color = i;
          ed.result = null;
        }
      },
    });
    ctx.fillStyle = COLORS[i].hex;
    ctx.beginPath();
    ctx.arc(x + 15, y + 15, 13, 0, 7);
    ctx.fill();
    if (ed.brush.color === i) {
      ctx.strokeStyle = '#2A2320';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
  for (let d = 0; d < 4; d++)
    chip(290 + d * 30, y + 2, 26, DIR_ARROW[d], ed.brush.dir === d, () => (ed.brush.dir = d), '#148F82');
  chip(414, y + 2, 26, String(ed.brush.need), true, () => (ed.brush.need = (ed.brush.need % 5) + 1), '#2A2320');
  const tools: [Tool, string][] = [
    ['paint', t('editor.paint')],
    ['erase', t('editor.erase')],
    ['rotate', t('editor.rotate')],
    ['need', t('editor.need')],
    ['vip', t('editor.vip')],
    ['lock', t('editor.lock')],
    ['ice', t('editor.ice')],
  ];
  tools.forEach(([id, label], i) => chip(40 + i * 58, 572, 54, label, ed.tool === id, () => (ed.tool = id)));
}

function drawKitchenRow(): void {
  const y = 612;
  const custom = !!ed.kitchen;
  chip(
    40,
    y,
    88,
    custom ? t('editor.kitchenCustom') : t('editor.kitchenAuto'),
    custom,
    () => {
      if (custom) ed.kitchen = null;
      else {
        const lv = currentLevel();
        ed.kitchen = lv ? lv.kitchen.map((p) => ({ ...p })) : [];
        ed.sel = 0;
      }
      ed.result = null;
    },
    '#E25E12'
  );
  const lv = currentLevel();
  const plates = ed.kitchen || (lv ? lv.kitchen : []);
  // Two rows of small plates; tap selects when the kitchen is custom.
  plates.slice(0, 60).forEach((p, i) => {
    const px = 140 + (i % 30) * 10,
      py = y + 6 + Math.floor(i / 30) * 16;
    ctx.fillStyle = COLORS[p.color]?.hex || '#000';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 7);
    ctx.fill();
    if (p.vip) {
      ctx.strokeStyle = '#F2B705';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    if (p.wasabi) txt('W', px, py - 8, 7, 800, '#2FB36B', 'center', 'middle'); // i18n-ignore
    if (p.covered) txt('C', px, py - 8, 7, 800, '#8A8F9C', 'center', 'middle'); // i18n-ignore
    if (p.double) txt('D', px, py - 8, 7, 800, '#2A2320', 'center', 'middle'); // i18n-ignore
    if (custom && i === ed.sel) {
      ctx.strokeStyle = '#2A2320';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, 7);
      ctx.stroke();
    }
    if (custom) G.buttons.push({ x: px - 5, y: py - 8, w: 10, h: 16, onTap: () => (ed.sel = i) });
  });
  txt(String(plates.length), 458, y + 13, 12, 800, '#5A4E45', 'right', 'middle');
  if (custom) {
    const flag = (x: number, label: string, key: 'vip' | 'double' | 'wasabi' | 'covered') =>
      chip(
        x,
        y + 40,
        30,
        label,
        !!ed.kitchen?.[ed.sel]?.[key],
        () => {
          const p = ed.kitchen?.[ed.sel];
          if (p) {
            p[key] = !p[key];
            ed.result = null;
          }
        },
        '#148F82'
      );
    flag(40, 'V', 'vip'); // i18n-ignore
    flag(74, 'D', 'double'); // i18n-ignore
    flag(108, 'W', 'wasabi'); // i18n-ignore
    flag(142, 'C', 'covered'); // i18n-ignore
    chip(
      190,
      y + 40,
      26,
      '+',
      true,
      () => {
        ed.kitchen!.push({ color: ed.brush.color, vip: false, double: false, wasabi: false, covered: false });
        ed.sel = ed.kitchen!.length - 1;
        ed.result = null;
      },
      '#4A4540'
    );
    chip(
      220,
      y + 40,
      26,
      '−',
      true,
      () => {
        if (ed.kitchen && ed.kitchen.length) {
          ed.kitchen.splice(ed.sel, 1);
          ed.sel = Math.max(0, Math.min(ed.sel, ed.kitchen.length - 1));
          ed.result = null;
        }
      },
      '#4A4540'
    );
    chip(256, y + 40, 90, t('editor.generate'), true, () => generateKitchen(), '#6A4C93');
  }
}

function drawStatus(): void {
  const y = 706;
  const beat = beatFor(ed.n);
  const r = ed.result;
  if (!r) txt(t('editor.unsolved'), 240, y, 13, 700, '#8A8378', 'center', 'middle');
  else if (r.ok)
    txt(
      t('editor.ok', { pct: Math.round(r.diff * 100), tier: r.tier }) +
        '  ·  ' +
        t('editor.band', { lo: Math.round(beat.band[0] * 100), hi: Math.round(beat.band[1] * 100) }),
      240,
      y,
      13,
      800,
      r.diff >= beat.band[0] && r.diff <= beat.band[1] ? '#2FB36B' : '#E25E12',
      'center',
      'middle'
    );
  else {
    txt(t('editor.problem'), 240, y - 8, 13, 800, '#E5484D', 'center', 'middle');
    txt(r.problems[0], 240, y + 10, 11, 700, '#E5484D', 'center', 'middle');
  }
}

export function drawEditor(): void {
  card(20, 60, 440, 820, '#3B3F4A', t('editor.title'));
  closeBtn(() => {
    sfx.ui();
    G.screen = { type: 'dev', t: 0 };
  });
  // Row A: level number, load, clear.
  stepper(40, 140, t('editor.level'), ed.n, (d) => {
    ed.n = Math.max(1, ed.n + d);
    ed.result = null;
  });
  chip(200, 127, 60, t('editor.load'), true, () => loadLevel(ed.n), '#148F82');
  chip(
    266,
    127,
    60,
    t('editor.clear'),
    true,
    () => {
      ed.cells = [];
      ed.kitchen = null;
      ed.result = null;
    },
    '#6B6560'
  );
  const lv = currentLevel();
  txt(t('editor.diners', { n: lv ? lv.diners.length : '?' }), 380, 141, 13, 800, '#5A4E45', 'left', 'middle');
  // Row B and C: dimensions and rules.
  stepper(40, 178, t('editor.rows'), ed.rows, (d) => {
    ed.rows = Math.max(2, Math.min(8, ed.rows + d));
    clampCells();
  });
  stepper(178, 178, t('editor.cols'), ed.cols, (d) => {
    ed.cols = Math.max(2, Math.min(8, ed.cols + d));
    clampCells();
  });
  stepper(316, 178, t('editor.colours'), ed.colors, (d) => {
    ed.colors = Math.max(2, Math.min(7, ed.colors + d));
    clampCells();
  });
  stepper(40, 212, t('editor.seats'), ed.seats, (d) => {
    ed.seats = Math.max(1, Math.min(5, ed.seats + d));
    ed.result = null;
  });
  stepper(178, 212, t('editor.belt'), ed.beltCap, (d) => {
    ed.beltCap = Math.max(4, Math.min(12, ed.beltCap + d));
    ed.result = null;
  });
  stepper(316, 212, t('editor.window'), ed.visibleNext, (d) => {
    ed.visibleNext = Math.max(0, Math.min(3, ed.visibleNext + d));
    ed.result = null;
  });
  drawGridArea();
  drawPalette();
  drawKitchenRow();
  drawStatus();
  const bw = 96,
    by = 742;
  button(40, by, bw, 40, t('editor.solve'), null, { primary: true, size: 14, onTap: () => solve() });
  button(146, by, bw, 40, t('editor.export'), null, { tone: '#3E7BFA', size: 14, onTap: () => exportJson() });
  button(252, by, bw, 40, t('editor.import'), null, { tone: '#6A4C93', size: 14, onTap: () => openImport() });
  button(358, by, bw, 40, t('editor.play'), null, { tone: '#148F82', size: 14, onTap: () => playTest() });
  txt(t('editor.hint'), 240, by + 56, 11, 700, '#8A8378', 'center', 'middle');
}

/* ---------- JSON in and out through the stats text box ---------- */

function box(): { root: HTMLElement; ta: HTMLTextAreaElement; apply: HTMLElement | null } {
  return {
    root: document.getElementById('statsBox') as HTMLElement,
    ta: document.getElementById('statsText') as HTMLTextAreaElement,
    apply: document.getElementById('statsApply'),
  };
}

export function exportJson(): string {
  const text = JSON.stringify(toJson(), null, 2);
  const b = box();
  b.ta.value = text;
  b.ta.readOnly = false;
  if (b.apply) b.apply.hidden = false;
  b.root.style.display = 'block';
  return text;
}

export function openImport(): void {
  const b = box();
  b.ta.value = '';
  b.ta.readOnly = false;
  b.ta.placeholder = '{ "n": 1, ... }';
  if (b.apply) b.apply.hidden = false;
  b.root.style.display = 'block';
}

export function importJson(text: string): boolean {
  try {
    const j = JSON.parse(text) as LevelJson;
    if (typeof j.n !== 'number' || !Array.isArray(j.cells)) throw new Error('not a level'); // i18n-ignore
    fromJson(j);
    levelFromJson(j); // throws if it cannot be peeled
    toast(t('editor.imported', { n: j.n }), 2);
    return true;
  } catch (e) {
    toast(t('editor.importFailed', { err: String((e as Error).message || e) }), 3);
    return false;
  }
}

/** Dev API surface. */
export const editorApi = {
  open: openEditor,
  load: loadLevel,
  get: toJson,
  set: (j: LevelJson) => fromJson(j),
  paint: paintToken,
  solve,
  play: playTest,
  state: () => ({
    n: ed.n,
    rows: ed.rows,
    cols: ed.cols,
    cells: ed.cells.length,
    kitchen: ed.kitchen ? ed.kitchen.length : null,
  }),
  cellToken: (r: number, c: number) => {
    const cell = cellAt(r, c);
    return cell ? formatCell(cell) : null;
  },
};

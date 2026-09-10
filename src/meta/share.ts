/* The share card: a 1080x1080 PNG of a cleared level or a rush score, with the player's diner and the store
   link, rendered off screen from the same art the game uses. Shared through the native sheet on iOS and
   Android, the Web Share API where a browser has it, and otherwise opened in a new tab. */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { characterSvg } from '../art/characters';
import { rasterize } from '../art/svg';
import { COLORS, GOLD } from '../data/constants';
import { storeLink } from '../data/leaderboards';
import { activeTheme } from '../data/theme-state';
import { toast } from '../engine/state';
import { t } from '../i18n';
import { isNative, platform } from '../platform/native';
import { S } from './save';

export type ShareKind = { type: 'level'; n: number } | { type: 'rush'; score: number };

export const CARD_SIZE = 1080;

function headline(kind: ShareKind): string {
  return kind.type === 'level' ? t('share.level', { n: kind.n }) : t('share.rush', { n: kind.score });
}

export function playerName(): string {
  return S.profile.name.trim() || t('profile.anon');
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function text(
  c: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  size: number,
  weight: number,
  color: string,
  align: CanvasTextAlign = 'center'
): void {
  c.font = `${weight} ${size}px Nunito, "Segoe UI", system-ui, sans-serif`;
  c.textAlign = align;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(s, x, y);
}

/** Draw the card. Pure apart from the sprite rasteriser. */
export async function renderShareCard(kind: ShareKind): Promise<HTMLCanvasElement> {
  const W = CARD_SIZE;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = W;
  const c = cv.getContext('2d') as CanvasRenderingContext2D;
  const th = activeTheme();
  const p = th.palette;
  // Wall and floor from the restaurant the player is in.
  c.fillStyle = p.wallWood;
  c.fillRect(0, 0, W, W);
  c.fillStyle = p.wallWoodLine;
  for (let y = 0; y < W; y += 72) c.fillRect(0, y, W, 6);
  c.fillStyle = p.floor;
  c.fillRect(0, W * 0.72, W, W * 0.28);
  c.fillStyle = p.floorLine;
  for (let x = 0; x < W; x += 120) c.fillRect(x, W * 0.72, 4, W * 0.28);
  // Header band.
  c.fillStyle = p.headerDark;
  c.fillRect(0, 0, W, 150);
  text(c, 'SUSHI JAM', W / 2, 78, 68, 900, '#FFF7E8'); // i18n-ignore
  // Belt ring with plates.
  c.strokeStyle = '#2A2320';
  c.lineWidth = 44;
  roundRect(c, 110, 210, W - 220, 520, 120);
  c.stroke();
  c.strokeStyle = '#3B3F4A';
  c.lineWidth = 8;
  c.setLineDash([26, 22]);
  roundRect(c, 110, 210, W - 220, 520, 120);
  c.stroke();
  c.setLineDash([]);
  COLORS.forEach((col, i) => {
    const ang = -Math.PI / 2 + (i / COLORS.length) * Math.PI * 2;
    const x = W / 2 + Math.cos(ang) * 380,
      y = 470 + Math.sin(ang) * 240;
    c.fillStyle = '#FFFDF7';
    c.beginPath();
    c.arc(x, y, 34, 0, 7);
    c.fill();
    c.fillStyle = col.hex;
    c.beginPath();
    c.arc(x, y, 22, 0, 7);
    c.fill();
  });
  // Paper card in the middle.
  c.fillStyle = '#FFFDF7';
  roundRect(c, 200, 270, W - 400, 400, 40);
  c.fill();
  // The diner.
  try {
    const img = await rasterize(characterSvg(S.profile.avatar, 'happy', false, false, th.outfit), 300, 300);
    c.drawImage(img, W / 2 - 150, 250, 300, 300);
  } catch {
    c.fillStyle = COLORS[S.profile.avatar]?.hex || COLORS[0].hex;
    c.beginPath();
    c.arc(W / 2, 400, 90, 0, 7);
    c.fill();
  }
  text(c, playerName(), W / 2, 560, 40, 800, '#5A4E45');
  text(c, headline(kind), W / 2, 625, 54, 900, '#2A2320');
  // Footer: tagline and the store link.
  text(c, t('share.tagline'), W / 2, 790, 44, 800, '#FFF7E8');
  c.fillStyle = GOLD;
  roundRect(c, 150, 850, W - 300, 110, 55);
  c.fill();
  text(c, t('share.play'), W / 2, 885, 34, 900, '#2A2320');
  text(c, storeLink(platform), W / 2, 930, 26, 700, '#5A4E45');
  return cv;
}

function toBlob(cv: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

function toBase64(cv: HTMLCanvasElement): string {
  return cv.toDataURL('image/png').split(',')[1];
}

export type ShareOutcome = 'shared' | 'opened' | 'downloaded' | 'failed';

/** Render and hand the card to the platform. Never throws. */
export async function shareCard(kind: ShareKind): Promise<ShareOutcome> {
  const line = headline(kind);
  const url = storeLink(platform);
  const textLine = t('share.text', { line, url });
  try {
    const cv = await renderShareCard(kind);
    if (isNative) {
      const w = await Filesystem.writeFile({
        path: 'sushi-jam-share.png',
        data: toBase64(cv),
        directory: Directory.Cache,
      });
      await Share.share({ title: t('share.title'), text: textLine, files: [w.uri], dialogTitle: t('share.button') });
      return 'shared';
    }
    const blob = await toBlob(cv);
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    const file = new File([blob], 'sushi-jam.png', { type: 'image/png' });
    if (typeof nav.share === 'function' && nav.canShare && nav.canShare({ files: [file] })) {
      try {
        await nav.share({ title: t('share.title'), text: textLine, files: [file] });
        return 'shared';
      } catch (e) {
        if ((e as Error)?.name === 'AbortError') return 'failed';
      }
    }
    const href = URL.createObjectURL(blob);
    const win = window.open(href, '_blank');
    if (win) {
      toast(t('share.opened'), 2.4);
      return 'opened';
    }
    const a = document.createElement('a');
    a.href = href;
    a.download = 'sushi-jam.png';
    a.click();
    toast(t('share.saved'), 2.4);
    return 'downloaded';
  } catch {
    toast(t('share.failed'), 2.4);
    return 'failed';
  }
}

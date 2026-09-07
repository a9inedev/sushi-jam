/* Settings (Game and Account tabs), Pause and Confirm. All of them freeze the level while open. */

import { applyMotion, systemReducedMotion } from '../anim/motion';
import { applyVolumes, sfx } from '../audio/audio';
import { LINKS, openLink } from '../data/links';
import { logStat, newLevel } from '../engine/rules';
import { closeScreen, cur, G, toast, type Screen } from '../engine/state';
import { LANGUAGES, languageName, locale, matchLocale, setLocale, t } from '../i18n';
import { purchases } from '../meta/providers';
import { backupInfo, clearSave, cloudProvider, restoreFromBackup, S, save } from '../meta/save';
import { haptic, isNative, platform } from '../platform/native';
import { ctx } from '../render/canvas';
import { card, rrect, txt, wrapText } from '../render/primitives';
import { button } from './buttons';

function toggleRow(y: number, label: string, sub: string | null, on: boolean, onTap: () => void): void {
  G.buttons.push({ x: 80, y: y - 28, w: 320, h: 56, onTap });
  txt(label, 92, sub ? y - 6 : y, 19, 800, '#2A2320', 'left', 'middle');
  if (sub) txt(sub, 92, y + 15, 12, 700, '#8A8378', 'left', 'middle');
  const px = 330,
    pw = 64,
    ph = 32;
  ctx.save();
  ctx.fillStyle = on ? '#2FB36B' : '#B9B2A5';
  rrect(px, y - ph / 2, pw, ph, ph / 2);
  ctx.fill();
  ctx.fillStyle = '#FFFDF7';
  ctx.beginPath();
  ctx.arc(on ? px + pw - ph / 2 : px + ph / 2, y, ph / 2 - 4, 0, 7);
  ctx.fill();
  txt(
    on ? t('dev.on') : t('dev.off').toUpperCase(),
    on ? px + 20 : px + pw - 20,
    y + 1,
    11,
    800,
    '#fff',
    'center',
    'middle'
  );
  ctx.restore();
}

/** A horizontal slider row. The whole row is the hit box; press or drag sets the value. */
function sliderRow(y: number, label: string, value: number, onChange: (v: number) => void): void {
  const tx = 186,
    tw = 170;
  const set = (x: number) => onChange(Math.max(0, Math.min(1, (x - tx) / tw)));
  G.buttons.push({ x: 80, y: y - 22, w: 320, h: 44, onTap: () => {}, onDrag: (x) => set(x) });
  txt(label, 92, y + 1, 16, 800, '#2A2320', 'left', 'middle');
  ctx.save();
  ctx.fillStyle = '#E4D6B4';
  rrect(tx, y - 4, tw, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#2FB36B';
  rrect(tx, y - 4, Math.max(8, tw * value), 8, 4);
  ctx.fill();
  const kx = tx + tw * value;
  ctx.fillStyle = '#FFFDF7';
  ctx.strokeStyle = '#2A2320';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(kx, y, 11, 0, 7);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  txt(Math.round(value * 100) + '%', 396, y + 1, 12, 700, '#8A8378', 'right', 'middle');
}

/** A row that shows a value on the right and cycles it on tap. */
function valueRow(y: number, label: string, value: string, onTap: () => void): void {
  G.buttons.push({ x: 80, y: y - 26, w: 320, h: 52, onTap });
  txt(label, 92, y + 1, 19, 800, '#2A2320', 'left', 'middle');
  txt(value + '  ›', 396, y + 1, 14, 800, '#148F82', 'right', 'middle');
}

function hapticsHint(): string {
  if (isNative) return t('settings.hapticsNative');
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') return t('settings.hapticsWeb');
  return t('settings.hapticsNone');
}

export function ago(ts: number): string {
  if (!ts) return t('time.earlier');
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return t('time.justNow');
  if (s < 3600) return t('time.minAgo', { n: Math.floor(s / 60) });
  if (s < 86400) return t('time.hAgo', { n: Math.floor(s / 3600) });
  return t('time.dAgo', { n: Math.floor(s / 86400) });
}

/** Apply the saved language (empty means follow the device). */
export function applyLanguage(): void {
  setLocale(S.lang || matchLocale(typeof navigator !== 'undefined' ? navigator.language : 'en'));
}

function cycleLanguage(): void {
  const codes = ['', ...LANGUAGES.map((l) => l.code)];
  const i = codes.indexOf(S.lang);
  S.lang = codes[(i + 1) % codes.length];
  save();
  applyLanguage();
}

function drawGameTab(): void {
  toggleRow(254, t('settings.sound'), t('settings.soundSub'), S.sound, () => {
    S.sound = !S.sound;
    save();
    applyVolumes();
    if (S.sound) sfx.ui();
  });
  const vol = (key: 'volMusic' | 'volSfx' | 'volUi') => (v: number) => {
    S[key] = Math.round(v * 20) / 20;
    applyVolumes();
    save();
  };
  sliderRow(302, t('settings.music'), S.volMusic, vol('volMusic'));
  sliderRow(344, t('settings.effects'), S.volSfx, vol('volSfx'));
  sliderRow(386, t('settings.interface'), S.volUi, vol('volUi'));
  toggleRow(440, t('settings.haptics'), hapticsHint(), S.haptics, () => {
    S.haptics = !S.haptics;
    save();
    sfx.ui();
    if (S.haptics) haptic('medium');
  });
  toggleRow(
    502,
    t('settings.reduceMotion'),
    systemReducedMotion() ? t('settings.reduceSystem') : t('settings.reduceSub'),
    S.reduceMotion || systemReducedMotion(),
    () => {
      S.reduceMotion = !S.reduceMotion;
      save();
      applyMotion();
      sfx.ui();
    }
  );
  toggleRow(564, t('settings.colorblind'), t('settings.colorblindSub'), S.colorblind, () => {
    S.colorblind = !S.colorblind;
    save();
    sfx.ui();
  });
  toggleRow(626, t('settings.leftHanded'), t('settings.leftHandedSub'), S.leftHanded, () => {
    S.leftHanded = !S.leftHanded;
    save();
    sfx.ui();
  });
  const auto = !S.lang;
  valueRow(
    686,
    t('settings.language'),
    auto ? t('settings.languageAuto', { name: languageName(locale()) }) : languageName(S.lang),
    () => {
      sfx.ui();
      cycleLanguage();
    }
  );
}

function drawAccountTab(sc: Screen): void {
  const c = cloudProvider();
  txt(
    c ? t('settings.cloud', { name: c.label }) : t('settings.cloudLater'),
    240,
    248,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
  const bak = backupInfo();
  button(
    100,
    276,
    280,
    44,
    t('settings.restore'),
    bak
      ? t('settings.restoreSub', { level: bak.level, coins: bak.coins.toLocaleString(), ago: ago(bak.savedAt) })
      : t('settings.noBackup'),
    {
      tone: '#148F82',
      disabled: !bak,
      onTap: () => {
        sfx.ui();
        if (!bak) return;
        G.screen = {
          type: 'confirm',
          t: 0,
          back: sc,
          title: t('settings.restoreTitle'),
          text: t('settings.restoreText', {
            level: S.level,
            coins: S.coins.toLocaleString(),
            ago: ago(bak.savedAt),
            bLevel: bak.level,
            bCoins: bak.coins.toLocaleString(),
          }),
          yes: t('settings.restoreYes'),
          onYes: () => {
            if (restoreFromBackup()) {
              G.screen = null;
              newLevel(S.level);
              toast(t('toast.restored'), 2.4);
            } else {
              G.screen = sc;
              toast(t('toast.restoreFailed'), 2);
            }
          },
        };
      },
    }
  );
  button(100, 332, 280, 44, t('settings.reset'), t('settings.resetSub'), {
    tone: '#E5484D',
    onTap: () => {
      sfx.ui();
      G.screen = {
        type: 'confirm',
        t: 0,
        back: sc,
        title: t('settings.resetTitle'),
        text: t('settings.resetText'),
        yes: t('settings.resetYes'),
        danger: true,
        onYes: () => {
          clearSave();
          location.reload();
        },
      };
    },
  });
  button(100, 388, 280, 44, t('settings.restorePurchases'), t('settings.restorePurchasesSub'), {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      void purchases.restore().then((ids) => {
        if (ids.includes('noads')) S.noAds = true;
        save();
        toast(t('toast.restorePurchases'), 2.2);
      });
    },
  });
  button(100, 444, 280, 44, t('settings.privacy'), null, { tone: '#4A4540', onTap: () => openLink(LINKS.privacy) });
  button(100, 500, 280, 44, t('settings.terms'), null, { tone: '#4A4540', onTap: () => openLink(LINKS.terms) });
  button(100, 556, 280, 44, t('settings.support'), null, { tone: '#4A4540', onTap: () => openLink(LINKS.support) });
}

export function drawSettings(sc: Screen): void {
  card(60, 120, 360, 740, '#3B3F4A', t('settings.title'));
  const tab = sc.tab === 'account' ? 'account' : 'game';
  button(90, 190, 140, 36, t('settings.tabGame'), null, {
    tone: tab === 'game' ? '#3B3F4A' : '#B9B2A5',
    size: 14,
    onTap: () => {
      sfx.ui();
      sc.tab = 'game';
    },
  });
  button(250, 190, 140, 36, t('settings.tabAccount'), null, {
    tone: tab === 'account' ? '#3B3F4A' : '#B9B2A5',
    size: 14,
    onTap: () => {
      sfx.ui();
      sc.tab = 'account';
    },
  });
  if (tab === 'game') drawGameTab();
  else drawAccountTab(sc);
  txt(
    t('settings.version', { v: __APP_VERSION__, platform: isNative ? platform : 'web' }),
    240,
    726,
    12,
    700,
    '#8A8378',
    'center',
    'middle'
  );
  button(150, 748, 180, 46, t('settings.done'), null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      G.screen = sc.back || null;
    },
  });
}

export function drawConfirm(sc: Screen): void {
  card(60, 280, 360, 300, sc.danger ? '#E5484D' : '#3B3F4A', sc.title || t('confirm.sure'));
  wrapText(sc.text || '', 240, 372, 300, 15, '#5A4E45');
  button(100, 470, 130, 48, sc.yes || t('confirm.yes'), null, {
    primary: !!sc.danger,
    tone: '#148F82',
    onTap: () => {
      sfx.ui();
      if (sc.onYes) sc.onYes();
    },
  });
  button(250, 470, 130, 48, t('confirm.cancel'), null, {
    tone: '#6B6560',
    onTap: () => {
      sfx.ui();
      G.screen = sc.back || null;
    },
  });
}

export function drawPause(sc: Screen): void {
  const L = cur();
  card(60, 250, 360, 380, '#6A4C93', t('pause.title'));
  txt(t('hud.level', { n: L.n }), 240, 330, 22, 800, '#2A2320', 'center', 'middle');
  button(100, 360, 280, 52, t('pause.resume'), null, {
    primary: true,
    onTap: () => {
      sfx.ui();
      closeScreen();
    },
  });
  button(100, 424, 280, 44, t('pause.restart'), null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      if (L.status === 'play' && L.stat.taps > 0) logStat('restart');
      closeScreen();
      newLevel(L.n);
    },
  });
  button(100, 480, 280, 44, t('pause.settings'), null, {
    tone: '#4A4540',
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'settings', t: 0, tab: 'game', back: sc };
    },
  });
  button(100, 536, 280, 44, t('pause.map'), null, {
    tone: '#6A4C93',
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'map', tab: 'path', t: 0, back: sc };
    },
  });
}

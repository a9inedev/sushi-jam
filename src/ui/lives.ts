/* Lives on screen: the hearts in the HUD (variant B only) and the out-of-lives card with its countdown, the
   rewarded ad for one life, and the way back to the map. */

import { sfx } from '../audio/audio';
import { G, showAd, type Screen } from '../engine/state';
import { t } from '../i18n';
import { formatCountdown } from '../meta/lives-core';
import { addLife, lives, livesCanPlay, livesEnabled, livesNextIn, livesUnlimited } from '../meta/lives';
import { S } from '../meta/save';
import { ctx } from '../render/canvas';
import { card, rrect, txt } from '../render/primitives';
import { button } from './buttons';

function heart(x: number, y: number, r: number, on: boolean): void {
  ctx.save();
  ctx.fillStyle = on ? '#E5484D' : 'rgba(42,35,32,.18)';
  ctx.beginPath();
  ctx.moveTo(x, y + r * 0.9);
  ctx.bezierCurveTo(x - r * 1.3, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
  ctx.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.3, y - r * 0.1, x, y + r * 0.9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** Hearts under the coins, on the side opposite the level label. */
export function drawHudLives(x: number, y: number, right: boolean): void {
  if (!livesEnabled()) return;
  const st = lives();
  const unlimited = livesUnlimited();
  const w = unlimited ? 96 : st.max * 16 + 14;
  const x0 = right ? x - w : x;
  ctx.save();
  ctx.fillStyle = 'rgba(42,35,32,.55)';
  rrect(x0, y - 11, w, 22, 11);
  ctx.fill();
  ctx.restore();
  if (unlimited) {
    heart(x0 + 14, y + 1, 6, true);
    txt(t('lives.unlimitedShort'), x0 + 26, y + 1, 11, 800, '#FFF7E8', 'left', 'middle');
  } else {
    for (let i = 0; i < st.max; i++) heart(x0 + 14 + i * 16, y + 1, 6, i < st.n);
  }
}

/** The out-of-lives card. `sc.onDone` is the level start that was gated. */
export function drawLivesScreen(sc: Screen): void {
  const st = lives();
  const ready = livesCanPlay();
  card(60, 230, 360, 420, '#E5484D', t('lives.title'));
  for (let i = 0; i < st.max; i++) heart(240 + (i - (st.max - 1) / 2) * 40, 320, 15, i < st.n);
  const next = livesNextIn();
  txt(
    ready ? t('lives.ready') : t('lives.next', { t: formatCountdown(next) }),
    240,
    372,
    16,
    800,
    ready ? '#2FB36B' : '#2A2320',
    'center',
    'middle'
  );
  txt(t('lives.rule', { n: st.max }), 240, 400, 12, 700, '#8A8378', 'center', 'middle');
  const go = () => {
    const f = sc.onDone;
    G.screen = null;
    if (f) f();
  };
  if (ready) button(90, 440, 300, 52, t('lives.play'), null, { primary: true, onTap: () => (sfx.ui(), go()) });
  else
    button(90, 440, 300, 52, t('lives.ad'), S.demoAds ? t('fail.adSub') : t('fail.adOff'), {
      primary: true,
      disabled: !S.demoAds,
      onTap: () => {
        sfx.ui();
        showAd('reward', () => {
          addLife(1);
          go();
        });
      },
    });
  button(90, 506, 300, 44, t('lives.wait'), null, {
    tone: '#3B3F4A',
    onTap: () => {
      sfx.ui();
      G.screen = { type: 'map', tab: 'path', t: 0 };
    },
  });
  txt(t('lives.events'), 240, 600, 12, 700, '#8A8378', 'center', 'middle');
}

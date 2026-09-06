/* What happens between levels: the starter offer, the demo ad break, then the next level. */

import { newLevel } from '../engine/rules';
import { G, cur, runPending, showAd } from '../engine/state';
import { S, save } from './save';

export function afterWin(): void {
  const nn = cur().n + 1,
    n = cur().n;
  G.pending = [];
  if (!S.starterShown && n >= 5)
    G.pending.push(() => {
      G.screen = { type: 'offer', t: 0 };
    });
  if (S.demoAds && !S.noAds && n >= 13) {
    S.levelsSinceAd++;
    if (S.levelsSinceAd >= 2) {
      S.levelsSinceAd = 0;
      G.pending.push(() => showAd('inter', runPending));
    }
  }
  G.pending.push(() => {
    newLevel(nn);
    save();
  });
  runPending();
}

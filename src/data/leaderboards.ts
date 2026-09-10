/* Leaderboard ids and store links. The ids are placeholders until the boards exist in App Store Connect and
   the Play Console; docs/leaderboards.md walks through creating them. Nothing else in the code knows an id. */

export type BoardId = 'weekly' | 'rush';

export const BOARD_IDS: Record<BoardId, { ios: string; android: string }> = {
  // Game Center: a recurring leaderboard with a weekly period. Play Games: any leaderboard; the weekly
  // time span is picked at read time.
  weekly: { ios: 'sushijam.weekly_levels', android: 'REPLACE_WITH_PLAY_WEEKLY_ID' },
  rush: { ios: 'sushijam.rush_best', android: 'REPLACE_WITH_PLAY_RUSH_ID' },
};

/** Where the share card points. The store pages do not exist yet; the web build is the fallback. */
export const STORE_LINKS = {
  ios: 'https://apps.apple.com/app/id0000000000',
  android: 'https://play.google.com/store/apps/details?id=com.a9inedev.sushijam',
  web: 'https://a9inedev.github.io/sushi-jam/',
};

export function storeLink(platform: 'web' | 'ios' | 'android'): string {
  return STORE_LINKS[platform] || STORE_LINKS.web;
}

/** How many rows a board shows. */
export const BOARD_ROWS = 8;

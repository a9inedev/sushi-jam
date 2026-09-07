/* Outbound links shown in Settings. Hosted pages replace these before store submission (Phase 5.3). */
export const LINKS = {
  privacy: 'https://github.com/a9inedev/sushi-jam/blob/main/docs/privacy.md',
  terms: 'https://github.com/a9inedev/sushi-jam/blob/main/docs/terms.md',
  support: 'https://github.com/a9inedev/sushi-jam/issues',
};

export function openLink(url: string): void {
  try {
    window.open(url, '_blank', 'noopener');
  } catch {
    /* blocked popups are not fatal */
  }
}

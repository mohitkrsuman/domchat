/** Extract a session id from a paste of URL, path, or raw id. */
export function parseSessionIdInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/sessions\/([^/?#]+)/);
    if (match?.[1]) return decodeURIComponent(match[1]);
  } catch {
    // not a full URL
  }

  const pathMatch = trimmed.match(/(?:^|\/)sessions\/([^/?#\s]+)/);
  if (pathMatch?.[1]) return decodeURIComponent(pathMatch[1]);

  // cuid / uuid-like raw id (no spaces or slashes)
  if (/^[a-zA-Z0-9_-]{8,}$/.test(trimmed)) return trimmed;

  return null;
}

/**
 * Returns the URL only if it is an absolute http(s) URL without embedded
 * credentials. Used for every externally sourced link rendered in the UI
 * (defence in depth – the pipeline already filters links on import).
 */
export function safeExternalUrl(value: string | undefined | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

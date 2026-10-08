// Small fetch wrapper for the data pipeline: timeouts, bounded retries with
// backoff (honouring Retry-After), and a response size cap.

const USER_AGENT = 'EnergyTrendRadar/3.0 (+https://github.com/ecke2001/energytrendradar)';

export interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: string;
  retries?: number;
  timeoutMs?: number;
  maxBytes?: number;
  headers?: Record<string, string>;
}

export class HttpError extends Error {
  constructor(public readonly status: number) {
    super(`HTTP ${status}`);
  }
  get retryable(): boolean {
    return this.status === 408 || this.status === 429 || this.status >= 500;
  }
}

export const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

function backoffMs(attempt: number, retryAfter: string | null): number {
  const seconds = retryAfter ? Number(retryAfter) : NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds, 60) * 1000;
  return Math.min(2000 * 2 ** attempt, 30000) + Math.floor(Math.random() * 500);
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const { method = 'GET', body, retries = 3, timeoutMs = 30000, maxBytes = 20 * 1024 * 1024, headers = {} } = options;
  let lastError: unknown = new Error('no attempt made');

  for (let attempt = 0; attempt <= retries; attempt++) {
    let retryAfter: string | null = null;
    try {
      const res = await fetch(url, {
        method,
        body,
        headers: { 'User-Agent': USER_AGENT, ...headers },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        retryAfter = res.headers.get('retry-after');
        throw new HttpError(res.status);
      }
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > maxBytes) throw new Error(`response too large (${declared} bytes)`);
      const text = await res.text();
      if (text.length > maxBytes) throw new Error(`response too large (${text.length} chars)`);
      return text;
    } catch (err) {
      lastError = err;
      if (err instanceof HttpError && !err.retryable) break;
      if (attempt < retries) await sleep(backoffMs(attempt, retryAfter));
    }
  }
  throw lastError;
}

export async function fetchJson<T = unknown>(url: string, options: FetchOptions = {}): Promise<T> {
  const text = await fetchText(url, { ...options, headers: { Accept: 'application/json', ...options.headers } });
  return JSON.parse(text) as T;
}

/**
 * Short, log-safe description of an error: no stack traces, no URLs, no
 * response snippets (JSON.parse errors quote the body), single line so it
 * cannot inject GitHub Actions workflow commands.
 */
export function describeError(err: unknown): string {
  if (err instanceof HttpError) return err.message;
  if (err instanceof SyntaxError) return 'ungültige JSON-Antwort';
  const message = err instanceof Error
    ? (err.name === 'TimeoutError' || err.name === 'AbortError' ? 'timeout' : err.message)
    : String(err);
  return message
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/::/g, ': :')
    .slice(0, 200);
}

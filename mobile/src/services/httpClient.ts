export const REQUEST_TIMEOUT_MS = 10000;

export type HttpClientErrorCode = 'CONFIGURATION' | 'TIMEOUT' | 'CANCELLED';

export class HttpClientError extends Error {
  constructor(public readonly code: HttpClientErrorCode) {
    super(code);
    this.name = 'HttpClientError';
  }
}

export function absoluteApiUrl(value: string | undefined): string {
  const url = value?.trim().replace(/\/$/, '');
  if (!url || !/^https?:\/\//i.test(url) || url.includes('IP-DO-COMPUTADOR')) {
    throw new HttpClientError('CONFIGURATION');
  }
  return url;
}

export function apiUrl(path: string): string {
  return `${absoluteApiUrl(process.env.EXPO_PUBLIC_API_URL)}${path}`;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  externalSignal?: AbortSignal,
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  externalSignal?.addEventListener('abort', abort, { once: true });
  if (externalSignal?.aborted) controller.abort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);

  try {
    return await operation(controller.signal);
  } catch (error) {
    if (timedOut) throw new HttpClientError('TIMEOUT');
    if (externalSignal?.aborted) throw new HttpClientError('CANCELLED');
    // Preserve errors raised by authenticatedFetch, especially SESSION_EXPIRED.
    throw error;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', abort);
  }
}

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  fetcher: Fetcher = fetch,
): Promise<Response> {
  return withTimeout(
    (signal) => fetcher(input, { ...init, signal }),
    init.signal ?? undefined,
  );
}

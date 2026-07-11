export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'FetchTimeoutError';
  }
}

/** Fetch with AbortSignal timeout — avoids Docker build hangs on unreachable APIs. */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeoutMs?: number },
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 8_000;
  const { timeoutMs: _omit, signal: existingSignal, ...rest } = init ?? {};

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const onAbort = () => controller.abort();
  existingSignal?.addEventListener('abort', onAbort);

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new FetchTimeoutError();
    }
    throw err;
  } finally {
    clearTimeout(timer);
    existingSignal?.removeEventListener('abort', onAbort);
  }
}

export function isFetchTimeoutError(err: unknown): boolean {
  if (err instanceof FetchTimeoutError) return true;
  if (err instanceof Error) {
    return err.name === 'AbortError' || /timed out/i.test(err.message);
  }
  return false;
}

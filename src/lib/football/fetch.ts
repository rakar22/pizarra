const cache = new Map<string, { at: number; data: unknown }>();

const UA = "Pizarra/1.0 (football analysis)";
const FETCH_TIMEOUT_MS = 10_000;

function requestSignal(signal?: AbortSignal | null): AbortSignal {
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  if (!signal) return timeout;
  return AbortSignal.any([signal, timeout]);
}

export async function cachedJson<T>(url: string, ttlMs = 180_000, init?: RequestInit): Promise<T> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  let lastErr: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 250 * attempt));
      const res = await fetch(url, {
        ...init,
        signal: requestSignal(init?.signal),
        headers: {
          Accept: "application/json,text/plain,*/*",
          "User-Agent": UA,
          ...(init?.headers ?? {}),
        },
      });
      if (!res.ok) {
        lastErr = new Error(`Fetch ${res.status} ${url}`);
        continue;
      }
      const data = (await res.json()) as T;
      cache.set(url, { at: Date.now(), data });
      return data;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error(`Fetch failed ${url}`);
}

export async function cachedJsonSoft<T>(url: string, ttlMs = 180_000): Promise<T | null> {
  try {
    return await cachedJson<T>(url, ttlMs);
  } catch {
    return null;
  }
}

export async function cachedTextSoft(url: string, ttlMs = 180_000): Promise<string | null> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as string;
  try {
    const res = await fetch(url, {
      signal: requestSignal(),
      headers: {
        Accept: "text/csv,text/plain,*/*",
        "User-Agent": UA,
      },
    });
    if (!res.ok) return null;
    const data = await res.text();
    cache.set(url, { at: Date.now(), data });
    return data;
  } catch {
    return null;
  }
}

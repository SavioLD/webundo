/**
 * Einfaches In-Memory-Rate-Limiting (Fixed Window) pro Schlüssel (z. B. IP).
 *
 * Ausreichend für ein Single-Node-MVP. Skalierungspfad: bei mehreren Instanzen
 * durch einen Redis-basierten Limiter ersetzen (gleiche Schnittstelle
 * `check(key)`), damit das Limit clusterweit gilt.
 */
export interface RateLimiter {
  check(key: string): { allowed: boolean; remaining: number; resetMs: number };
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(limit: number, windowMs: number): RateLimiter {
  const buckets = new Map<string, Bucket>();

  // Periodisches Aufräumen abgelaufener Buckets (verhindert Speicherwachstum).
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, b] of buckets) if (b.resetAt <= now) buckets.delete(key);
  }, windowMs).unref?.();
  void interval;

  return {
    check(key: string) {
      const now = Date.now();
      let b = buckets.get(key);
      if (!b || b.resetAt <= now) {
        b = { count: 0, resetAt: now + windowMs };
        buckets.set(key, b);
      }
      b.count += 1;
      const allowed = b.count <= limit;
      return { allowed, remaining: Math.max(0, limit - b.count), resetMs: b.resetAt - now };
    },
  };
}

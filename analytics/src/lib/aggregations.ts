/**
 * Reine Berechnungsfunktionen für Kennzahlen. Bewusst ohne DB-Bezug, damit sie
 * isoliert und deterministisch getestet werden können (siehe test/aggregations).
 */

export interface SessionLike {
  visitor_id: string;
  first_seen: string; // ISO
  last_seen: string; // ISO
  page_view_count: number;
}

/** Absprungrate = Anteil der Sessions mit genau einem Seitenaufruf (%). */
export function bounceRate(sessions: Pick<SessionLike, "page_view_count">[]): number {
  if (sessions.length === 0) return 0;
  const bounces = sessions.filter((s) => s.page_view_count <= 1).length;
  return round2((bounces / sessions.length) * 100);
}

/** Sitzungsdauer in Sekunden (nicht-negativ). */
export function sessionDurationSeconds(firstSeen: string, lastSeen: string): number {
  const d = (new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 1000;
  return d > 0 ? Math.round(d) : 0;
}

/** Durchschnittliche Sitzungsdauer in Sekunden über alle Sessions. */
export function avgSessionDuration(sessions: Pick<SessionLike, "first_seen" | "last_seen">[]): number {
  if (sessions.length === 0) return 0;
  const total = sessions.reduce(
    (sum, s) => sum + sessionDurationSeconds(s.first_seen, s.last_seen),
    0,
  );
  return round2(total / sessions.length);
}

/** Anzahl eindeutiger Besucher (distinct visitor_id). */
export function uniqueVisitors(sessions: Pick<SessionLike, "visitor_id">[]): number {
  return new Set(sessions.map((s) => s.visitor_id)).size;
}

/**
 * Gruppiert Werte und zählt sie, absteigend sortiert. Nützlich für Top-Seiten,
 * Referrer, Geräte usw. Leere/undefinierte Werte werden als "unknown" gezählt.
 */
export function topCounts<T>(
  items: T[],
  key: (item: T) => string | null | undefined,
  limit = 10,
): { label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = (key(item) ?? "").toString().trim() || "unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Prozentanteil (0..100) mit Schutz vor Division durch 0. */
export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return round2((part / total) * 100);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

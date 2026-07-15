import { describe, it, expect } from "vitest";
import {
  bounceRate,
  sessionDurationSeconds,
  avgSessionDuration,
  uniqueVisitors,
  topCounts,
  percentage,
} from "../src/lib/aggregations.js";

describe("bounceRate", () => {
  it("gibt 0 bei leerer Liste zurück", () => {
    expect(bounceRate([])).toBe(0);
  });
  it("zählt Sessions mit <=1 Seitenaufruf als Absprung", () => {
    const sessions = [{ page_view_count: 1 }, { page_view_count: 1 }, { page_view_count: 5 }, { page_view_count: 3 }];
    expect(bounceRate(sessions)).toBe(50);
  });
  it("100% wenn alle abspringen", () => {
    expect(bounceRate([{ page_view_count: 1 }, { page_view_count: 0 }])).toBe(100);
  });
});

describe("sessionDurationSeconds", () => {
  it("berechnet die Differenz in Sekunden", () => {
    expect(sessionDurationSeconds("2026-01-01T00:00:00Z", "2026-01-01T00:02:00Z")).toBe(120);
  });
  it("nie negativ", () => {
    expect(sessionDurationSeconds("2026-01-01T00:05:00Z", "2026-01-01T00:00:00Z")).toBe(0);
  });
});

describe("avgSessionDuration", () => {
  it("mittelt über alle Sessions", () => {
    const sessions = [
      { first_seen: "2026-01-01T00:00:00Z", last_seen: "2026-01-01T00:01:00Z" }, // 60
      { first_seen: "2026-01-01T00:00:00Z", last_seen: "2026-01-01T00:03:00Z" }, // 180
    ];
    expect(avgSessionDuration(sessions)).toBe(120);
  });
  it("0 bei leerer Liste", () => {
    expect(avgSessionDuration([])).toBe(0);
  });
});

describe("uniqueVisitors", () => {
  it("zählt eindeutige visitor_id", () => {
    const sessions = [{ visitor_id: "a" }, { visitor_id: "a" }, { visitor_id: "b" }];
    expect(uniqueVisitors(sessions)).toBe(2);
  });
});

describe("topCounts", () => {
  it("gruppiert, zählt und sortiert absteigend", () => {
    const items = [{ p: "/" }, { p: "/" }, { p: "/kontakt" }, { p: "/" }, { p: "/kontakt" }];
    const result = topCounts(items, (i) => i.p);
    expect(result[0]).toEqual({ label: "/", count: 3 });
    expect(result[1]).toEqual({ label: "/kontakt", count: 2 });
  });
  it("behandelt leere Werte als 'unknown'", () => {
    const result = topCounts([{ p: "" }, { p: null }], (i) => i.p as string | null);
    expect(result[0]).toEqual({ label: "unknown", count: 2 });
  });
  it("respektiert das Limit", () => {
    const items = Array.from({ length: 20 }, (_, i) => ({ p: "p" + i }));
    expect(topCounts(items, (i) => i.p, 5)).toHaveLength(5);
  });
});

describe("percentage", () => {
  it("berechnet Prozent", () => {
    expect(percentage(1, 4)).toBe(25);
  });
  it("schützt vor Division durch 0", () => {
    expect(percentage(5, 0)).toBe(0);
  });
});

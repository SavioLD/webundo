/**
 * Zentrale Typdefinitionen der Analytics-Plattform.
 * Die AnalyticsEvent-Struktur entspricht dem in der Aufgabenstellung
 * vorgegebenen Vertrag zwischen Tracker und Ingestion-API.
 */

export const EVENT_TYPES = [
  "page_view",
  "click",
  "form",
  "conversion",
  "error",
  "performance",
  "custom",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

/** Erlaubte Property-Werte – bewusst eng gefasst (Datensparsamkeit). */
export type PropertyValue = string | number | boolean | null;

/**
 * Vom Tracker gesendetes Event. `tenantId`, `visitorId` und Geo/Device
 * werden serverseitig abgeleitet bzw. überschrieben und müssen vom Client
 * nicht (bzw. dürfen nicht vertrauenswürdig) gesetzt werden.
 */
export interface AnalyticsEvent {
  eventId: string;
  tenantId: string;
  websiteId: string;
  sessionId: string;
  visitorId?: string;
  eventName: string;
  eventType: EventType;
  pageUrl: string;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  properties?: Record<string, PropertyValue>;
  timestamp: string;
}

export type UserRole = "super_admin" | "staff" | "customer";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Tenant {
  id: string;
  name: string;
  retention_days: number;
  created_at: string;
}

export interface Website {
  id: string;
  tenant_id: string;
  name: string;
  domain: string;
  /** Öffentliche ID, die im Tracker als data-website-id verwendet wird. */
  tracking_id: string;
  retention_days: number | null;
  created_at: string;
}

export interface DeviceInfo {
  deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser: string;
  os: string;
}

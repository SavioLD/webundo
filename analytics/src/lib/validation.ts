import { z } from "zod";
import { EVENT_TYPES } from "../types.js";

/**
 * Schema-Validierung für eingehende Events. Streng gefasst gegen Missbrauch:
 * feste Eventtypen, Längenlimits, nur primitive Property-Werte, begrenzte
 * Anzahl Properties (Datensparsamkeit + Schutz vor aufgeblähten Payloads).
 */

const propertyValue = z.union([
  z.string().max(500),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const analyticsEventSchema = z.object({
  eventId: z.string().min(8).max(100),
  // websiteId ist hier die öffentliche tracking_id.
  websiteId: z.string().min(1).max(100),
  sessionId: z.string().min(8).max(100),
  eventName: z.string().min(1).max(120),
  eventType: z.enum(EVENT_TYPES),
  pageUrl: z.string().max(2048),
  pagePath: z.string().max(1024),
  pageTitle: z.string().max(512).optional(),
  referrer: z.string().max(2048).optional(),
  properties: z.record(propertyValue).refine((o) => Object.keys(o).length <= 30, {
    message: "zu viele Properties (max. 30)",
  }).optional(),
  timestamp: z.string().datetime().or(z.string().max(40)),
});

/** Der Endpunkt akzeptiert ein einzelnes Event oder eine gebündelte Liste. */
export const eventBatchSchema = z.union([
  analyticsEventSchema,
  z.array(analyticsEventSchema).min(1).max(50),
]);

export type ValidatedEvent = z.infer<typeof analyticsEventSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
});

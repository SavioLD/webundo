import type { DeviceInfo } from "../types.js";

/**
 * Leichtgewichtiges User-Agent-Parsing ohne externe Abhängigkeit.
 * Bewusst grob: Ziel ist Datensparsamkeit (grobe Gerätekategorie/Browser/OS),
 * nicht die präzise Identifikation eines Geräts (kein Fingerprinting).
 */
export function parseUserAgent(ua: string | undefined): DeviceInfo {
  if (!ua) return { deviceType: "unknown", browser: "unknown", os: "unknown" };
  const s = ua.toLowerCase();

  if (/(bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit)/.test(s)) {
    return { deviceType: "bot", browser: "bot", os: "unknown" };
  }

  const isTablet = /ipad|tablet|(android(?!.*mobile))/.test(s);
  const isMobile = /mobi|iphone|ipod|android|blackberry|iemobile|opera mini/.test(s);
  const deviceType: DeviceInfo["deviceType"] = isTablet
    ? "tablet"
    : isMobile
      ? "mobile"
      : "desktop";

  let browser = "unknown";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("chrome/") && !s.includes("chromium")) browser = "Chrome";
  else if (s.includes("firefox/")) browser = "Firefox";
  else if (s.includes("safari/") && !s.includes("chrome")) browser = "Safari";
  else if (s.includes("chromium")) browser = "Chromium";

  let os = "unknown";
  if (s.includes("windows")) os = "Windows";
  else if (s.includes("android")) os = "Android";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (s.includes("mac os")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";

  return { deviceType, browser, os };
}

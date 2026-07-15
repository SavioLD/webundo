import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import type Database from "better-sqlite3";
import { config } from "../config.js";
import type { AuthUser, UserRole } from "../types.js";

/** Erweitert Express.Request um den authentifizierten Benutzer. */
export interface AuthedRequest extends Request {
  user?: AuthUser;
  db: Database.Database;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: config.jwtExpiresIn as jwt.SignOptions["expiresIn"] });
}

export function verifyToken(token: string): AuthUser | null {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload & AuthUser;
    return { id: decoded.id, email: decoded.email, name: decoded.name, role: decoded.role };
  } catch {
    return null;
  }
}

/** Liest das Token aus Cookie oder Authorization-Header. */
function extractToken(req: Request): string | null {
  const bearer = req.header("authorization");
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  const cookie = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
  return cookie ?? null;
}

/** Middleware: erzwingt Authentifizierung. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  const user = token ? verifyToken(token) : null;
  if (!user) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  (req as AuthedRequest).user = user;
  next();
}

/**
 * Liefert die IDs der Websites, auf die ein Benutzer zugreifen darf.
 * super_admin: alle. staff/customer: nur explizit zugewiesene.
 */
export function accessibleWebsiteIds(db: Database.Database, user: AuthUser): string[] {
  if (user.role === "super_admin") {
    return (db.prepare("SELECT id FROM websites").all() as { id: string }[]).map((r) => r.id);
  }
  return (
    db
      .prepare("SELECT website_id AS id FROM user_website_access WHERE user_id = ?")
      .all(user.id) as { id: string }[]
  ).map((r) => r.id);
}

/**
 * Prüft, ob der Benutzer auf die angegebene Website zugreifen darf.
 * Zentrale Stelle der Mandantentrennung – von allen Dashboard-Queries genutzt.
 */
export function canAccessWebsite(db: Database.Database, user: AuthUser, websiteId: string): boolean {
  if (user.role === "super_admin") {
    return !!db.prepare("SELECT 1 FROM websites WHERE id = ?").get(websiteId);
  }
  return !!db
    .prepare("SELECT 1 FROM user_website_access WHERE user_id = ? AND website_id = ?")
    .get(user.id, websiteId);
}

export function hasRole(user: AuthUser, ...roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

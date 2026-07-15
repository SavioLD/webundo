import { Router, type Response } from "express";
import express from "express";
import type Database from "better-sqlite3";
import { loginSchema } from "../lib/validation.js";
import { signToken, verifyPassword, requireAuth, type AuthedRequest } from "../lib/auth.js";
import { config } from "../config.js";
import type { UserRole } from "../types.js";

export function authRouter(db: Database.Database): Router {
  const router = Router();
  router.use(express.json({ limit: "8kb" }));

  router.post("/login", (req, res: Response) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_payload" });
      return;
    }
    const { email, password } = parsed.data;
    const row = db
      .prepare("SELECT id, email, name, role, password_hash FROM users WHERE email = ?")
      .get(email) as
      | { id: string; email: string; name: string; role: UserRole; password_hash: string }
      | undefined;

    // Konstante Antwort für unbekannten Nutzer/falsches Passwort (kein User-Enumeration).
    if (!row || !verifyPassword(password, row.password_hash)) {
      res.status(401).json({ error: "invalid_credentials" });
      return;
    }

    const user = { id: row.id, email: row.email, name: row.name, role: row.role };
    const token = signToken(user);
    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProd,
      maxAge: 12 * 60 * 60 * 1000,
    });
    res.json({ token, user });
  });

  router.post("/logout", (_req, res) => {
    res.clearCookie("token");
    res.json({ ok: true });
  });

  router.get("/me", requireAuth, (req, res) => {
    res.json({ user: (req as AuthedRequest).user });
  });

  return router;
}

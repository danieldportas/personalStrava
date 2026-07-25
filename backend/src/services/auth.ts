import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { db } from "../db";
import { refreshAccessToken } from "./strava";
import type { User } from "../types";

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Devuelve un access_token valido, refrescandolo (y persistiendolo) si esta a punto de caducar. */
export async function getValidAccessToken(user: User): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (user.tokenExpiresAt - nowSeconds > 60) {
    return user.accessToken;
  }
  const refreshed = await refreshAccessToken(user.refreshToken);
  const updated: User = {
    ...user,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    tokenExpiresAt: refreshed.expires_at,
  };
  db.upsertUser(updated);
  return updated.accessToken;
}

export interface AuthedRequest extends Request {
  user?: User;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;
  if (!token) {
    res.status(401).json({ error: "Falta la cabecera Authorization: Bearer <token>" });
    return;
  }
  const user = db.findUserBySessionToken(token);
  if (!user) {
    res.status(401).json({ error: "Sesion invalida. Vuelve a conectar con Strava." });
    return;
  }
  req.user = user;
  next();
}

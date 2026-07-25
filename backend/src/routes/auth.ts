import { Router } from "express";
import crypto from "node:crypto";
import { config } from "../config";
import { db } from "../db";
import { generateSessionToken } from "../services/auth";
import { buildAuthorizeUrl, exchangeCodeForToken } from "../services/strava";
import type { User } from "../types";

export const authRouter = Router();

/** Punto de entrada: el navegador/WebView del movil abre esta URL. */
authRouter.get("/strava/login", (_req, res) => {
  res.redirect(buildAuthorizeUrl());
});

/** Strava redirige aqui tras la autorizacion del usuario. */
authRouter.get("/strava/callback", async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    res.redirect(`${config.mobileAppScheme}://auth-error?reason=${encodeURIComponent(String(error))}`);
    return;
  }
  if (typeof code !== "string") {
    res.status(400).send("Falta el parametro 'code' en la respuesta de Strava.");
    return;
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const athleteId = tokenResponse.athlete?.id;
    if (!athleteId) {
      throw new Error("La respuesta de Strava no incluyo el atleta.");
    }

    const existing = db.findUserByStravaAthleteId(athleteId);
    const user: User = {
      id: existing?.id ?? crypto.randomUUID(),
      stravaAthleteId: athleteId,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: tokenResponse.expires_at,
      sessionToken: existing?.sessionToken ?? generateSessionToken(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    db.upsertUser(user);

    res.redirect(`${config.mobileAppScheme}://auth-success?token=${user.sessionToken}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    res.redirect(`${config.mobileAppScheme}://auth-error?reason=${encodeURIComponent(message)}`);
  }
});

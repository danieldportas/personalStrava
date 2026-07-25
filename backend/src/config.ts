import "dotenv/config";
import path from "node:path";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Copia .env.example a .env y complétalo.`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  stravaClientId: process.env.STRAVA_CLIENT_ID ?? "",
  stravaClientSecret: process.env.STRAVA_CLIENT_SECRET ?? "",
  stravaRedirectUri: process.env.STRAVA_REDIRECT_URI ?? "http://localhost:4000/api/auth/strava/callback",
  mobileAppScheme: process.env.MOBILE_APP_SCHEME ?? "personalstrava",
  dataFile: path.resolve(process.cwd(), process.env.DATA_FILE ?? "./data/db.json"),
};

export function assertStravaCredentialsConfigured(): void {
  required("STRAVA_CLIENT_ID");
  required("STRAVA_CLIENT_SECRET");
}

import { config } from "../config";
import type { StoredActivity } from "../types";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth";

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

export function buildAuthorizeUrl(): string {
  const params = new URLSearchParams({
    client_id: config.stravaClientId,
    redirect_uri: config.stravaRedirectUri,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read_all,profile:read_all",
  });
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.stravaClientId,
      client_secret: config.stravaClientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<StravaTokenResponse>;
}

export async function refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: config.stravaClientId,
      client_secret: config.stravaClientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<StravaTokenResponse>;
}

interface StravaSummaryActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  distance: number; // meters
  moving_time: number; // seconds
  total_elevation_gain: number;
  average_heartrate?: number;
  max_heartrate?: number;
  suffer_score?: number;
}

/** Trae las actividades de los ultimos `days` dias, paginando hasta agotar resultados. */
export async function fetchRecentActivities(
  accessToken: string,
  days = 90,
): Promise<StravaSummaryActivity[]> {
  const after = Math.floor((Date.now() - days * 24 * 60 * 60 * 1000) / 1000);
  const perPage = 100;
  let page = 1;
  const all: StravaSummaryActivity[] = [];

  while (true) {
    const params = new URLSearchParams({
      after: String(after),
      per_page: String(perPage),
      page: String(page),
    });
    const res = await fetch(`${STRAVA_API}/athlete/activities?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`Strava activities fetch failed: ${res.status} ${await res.text()}`);
    }
    const batch = (await res.json()) as StravaSummaryActivity[];
    all.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 10) break; // limite de seguridad
  }

  return all;
}

export function toStoredActivity(userId: string, a: StravaSummaryActivity): StoredActivity {
  const averagePaceSecPerKm =
    a.distance > 0 && a.type === "Run" ? (a.moving_time / (a.distance / 1000)) : null;

  return {
    id: String(a.id),
    userId,
    type: a.type,
    name: a.name,
    startDate: a.start_date,
    distanceMeters: a.distance,
    movingTimeSeconds: a.moving_time,
    elevationGainMeters: a.total_elevation_gain,
    averageHeartRate: a.average_heartrate ?? null,
    maxHeartRate: a.max_heartrate ?? null,
    averagePaceSecPerKm,
    sufferScore: a.suffer_score ?? null,
  };
}

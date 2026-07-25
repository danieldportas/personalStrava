import Constants from "expo-constants";
import type { Metrics, Profile, StoredActivity, WeeklyPlan } from "../types";

const configuredUrl =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "http://localhost:4000";

export const API_URL = configuredUrl.replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  sessionToken: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch (err) {
    throw new ApiError(
      `No se pudo conectar con el servidor (${API_URL}). Comprueba que esta encendido y accesible desde el movil.`,
      0,
    );
  }

  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // respuesta sin cuerpo JSON, mantenemos el mensaje generico
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  authorizeUrl: () => `${API_URL}/api/auth/strava/login`,

  getProfile: (token: string) => request<Profile>("/api/profile", token),
  saveProfile: (token: string, profile: Omit<Profile, "userId" | "updatedAt">) =>
    request<Profile>("/api/profile", token, { method: "PUT", body: JSON.stringify(profile) }),

  syncActivities: (token: string) =>
    request<{ synced: number; metrics: Metrics }>("/api/activities/sync", token, { method: "POST" }),
  getActivities: (token: string) => request<StoredActivity[]>("/api/activities", token),
  getMetrics: (token: string) => request<Metrics>("/api/activities/metrics", token),

  getCurrentPlan: (token: string) => request<WeeklyPlan>("/api/plan/current", token),
  regeneratePlan: (token: string) => request<WeeklyPlan>("/api/plan/generate", token, { method: "POST" }),
  getPlanHistory: (token: string) => request<WeeklyPlan[]>("/api/plan/history", token),
  setSessionCompleted: (token: string, sessionId: string, completed: boolean) =>
    request<{ ok: true }>(`/api/plan/sessions/${sessionId}/complete`, token, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    }),
};

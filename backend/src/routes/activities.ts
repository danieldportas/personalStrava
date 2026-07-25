import { Router } from "express";
import { db } from "../db";
import { getValidAccessToken, requireAuth, type AuthedRequest } from "../services/auth";
import { computeMetrics } from "../services/metrics";
import { fetchRecentActivities, toStoredActivity } from "../services/strava";

export const activitiesRouter = Router();
activitiesRouter.use(requireAuth);

activitiesRouter.post("/sync", async (req: AuthedRequest, res) => {
  try {
    const accessToken = await getValidAccessToken(req.user!);
    const raw = await fetchRecentActivities(accessToken, 90);
    const stored = raw.map((a) => toStoredActivity(req.user!.id, a));
    db.replaceActivities(req.user!.id, stored);
    res.json({ synced: stored.length, metrics: computeMetrics(stored) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido sincronizando con Strava.";
    res.status(502).json({ error: message });
  }
});

activitiesRouter.get("/", (req: AuthedRequest, res) => {
  const activities = db.getActivities(req.user!.id).slice(0, 100);
  res.json(activities);
});

activitiesRouter.get("/metrics", (req: AuthedRequest, res) => {
  const activities = db.getActivities(req.user!.id);
  res.json(computeMetrics(activities));
});

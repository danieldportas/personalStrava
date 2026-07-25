import { Router } from "express";
import { db } from "../db";
import { requireAuth, type AuthedRequest } from "../services/auth";
import { computeMetrics } from "../services/metrics";
import { generateWeeklyPlan } from "../services/planner";
import { startOfIsoWeek, isoDateOnly } from "../services/metrics";

export const planRouter = Router();
planRouter.use(requireAuth);

function currentWeekStartIso(): string {
  return isoDateOnly(startOfIsoWeek(new Date()));
}

function requireProfileOr400(userId: string) {
  const profile = db.getProfile(userId);
  if (!profile) {
    return null;
  }
  return profile;
}

planRouter.get("/current", (req: AuthedRequest, res) => {
  const profile = requireProfileOr400(req.user!.id);
  if (!profile) {
    res.status(400).json({ error: "Configura primero tu perfil de entrenamiento (POST /api/profile)." });
    return;
  }

  const existing = db.getLatestPlan(req.user!.id);
  if (existing && existing.weekStartDate === currentWeekStartIso()) {
    res.json(existing);
    return;
  }

  const metrics = computeMetrics(db.getActivities(req.user!.id));
  const plan = generateWeeklyPlan(profile, metrics);
  db.savePlan(plan);
  res.json(plan);
});

planRouter.post("/generate", (req: AuthedRequest, res) => {
  const profile = requireProfileOr400(req.user!.id);
  if (!profile) {
    res.status(400).json({ error: "Configura primero tu perfil de entrenamiento (POST /api/profile)." });
    return;
  }
  const metrics = computeMetrics(db.getActivities(req.user!.id));
  const plan = generateWeeklyPlan(profile, metrics);
  db.savePlan(plan);
  res.json(plan);
});

planRouter.get("/history", (req: AuthedRequest, res) => {
  res.json(db.getPlans(req.user!.id).slice(0, 12));
});

planRouter.patch("/sessions/:id/complete", (req: AuthedRequest, res) => {
  const { completed } = req.body ?? {};
  if (typeof completed !== "boolean") {
    res.status(400).json({ error: "completed debe ser booleano." });
    return;
  }
  const found = db.updateSessionCompletion(req.user!.id, req.params.id, completed);
  if (!found) {
    res.status(404).json({ error: "Sesion no encontrada." });
    return;
  }
  res.json({ ok: true });
});

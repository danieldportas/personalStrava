import { Router } from "express";
import { db } from "../db";
import { requireAuth, type AuthedRequest } from "../services/auth";
import type { ExperienceLevel, GoalType, Profile } from "../types";

export const profileRouter = Router();
profileRouter.use(requireAuth);

const GOAL_TYPES: GoalType[] = ["5k", "10k", "half_marathon", "marathon", "general_fitness"];
const EXPERIENCE_LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

function validateProfileInput(body: unknown): { error: string } | { value: Omit<Profile, "userId" | "updatedAt" | "programStartDate"> & { programStartDate?: string } } {
  if (typeof body !== "object" || body === null) return { error: "Cuerpo invalido." };
  const b = body as Record<string, unknown>;

  if (typeof b.goalType !== "string" || !GOAL_TYPES.includes(b.goalType as GoalType)) {
    return { error: `goalType debe ser uno de: ${GOAL_TYPES.join(", ")}` };
  }
  if (b.raceDate != null && typeof b.raceDate !== "string") {
    return { error: "raceDate debe ser una fecha ISO o null." };
  }
  if (typeof b.runDaysPerWeek !== "number" || b.runDaysPerWeek < 2 || b.runDaysPerWeek > 6) {
    return { error: "runDaysPerWeek debe ser un numero entre 2 y 6." };
  }
  if (typeof b.gymDaysPerWeek !== "number" || b.gymDaysPerWeek < 0 || b.gymDaysPerWeek > 4) {
    return { error: "gymDaysPerWeek debe ser un numero entre 0 y 4." };
  }
  if (typeof b.gymAccess !== "boolean") {
    return { error: "gymAccess debe ser booleano." };
  }
  if (typeof b.experienceLevel !== "string" || !EXPERIENCE_LEVELS.includes(b.experienceLevel as ExperienceLevel)) {
    return { error: `experienceLevel debe ser uno de: ${EXPERIENCE_LEVELS.join(", ")}` };
  }
  if (b.maxHeartRate != null && typeof b.maxHeartRate !== "number") {
    return { error: "maxHeartRate debe ser un numero o null." };
  }
  if (b.programStartDate != null && typeof b.programStartDate !== "string") {
    return { error: "programStartDate debe ser una fecha ISO." };
  }

  return {
    value: {
      goalType: b.goalType as GoalType,
      raceDate: (b.raceDate as string | null) ?? null,
      runDaysPerWeek: b.runDaysPerWeek as number,
      gymDaysPerWeek: b.gymDaysPerWeek as number,
      gymAccess: b.gymAccess as boolean,
      experienceLevel: b.experienceLevel as ExperienceLevel,
      maxHeartRate: (b.maxHeartRate as number | null) ?? null,
      programStartDate: b.programStartDate as string | undefined,
    },
  };
}

profileRouter.get("/", (req: AuthedRequest, res) => {
  const profile = db.getProfile(req.user!.id);
  if (!profile) {
    res.status(404).json({ error: "Todavia no has configurado tu perfil de entrenamiento." });
    return;
  }
  res.json(profile);
});

profileRouter.put("/", (req: AuthedRequest, res) => {
  const result = validateProfileInput(req.body);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  const existing = db.getProfile(req.user!.id);
  const profile: Profile = {
    userId: req.user!.id,
    goalType: result.value.goalType,
    raceDate: result.value.raceDate,
    runDaysPerWeek: result.value.runDaysPerWeek,
    gymDaysPerWeek: result.value.gymDaysPerWeek,
    gymAccess: result.value.gymAccess,
    experienceLevel: result.value.experienceLevel,
    maxHeartRate: result.value.maxHeartRate,
    programStartDate: result.value.programStartDate ?? existing?.programStartDate ?? new Date().toISOString().slice(0, 10),
    updatedAt: new Date().toISOString(),
  };
  db.saveProfile(profile);
  res.json(profile);
});

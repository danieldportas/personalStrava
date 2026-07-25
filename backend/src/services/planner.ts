import crypto from "node:crypto";
import type {
  DaySchedule,
  GoalType,
  GymFocus,
  GymSession,
  HeartRateTarget,
  Metrics,
  PaceTarget,
  PlanSession,
  Profile,
  RestSession,
  RunSession,
  RunSessionType,
  WeeklyPlan,
} from "../types";
import { FOCUS_LABEL, pickExercises } from "./exercises";
import { isoDateOnly, startOfIsoWeek } from "./metrics";

const DAY_MS = 24 * 60 * 60 * 1000;

// Progresion de volumen dentro de un mesociclo de 4 semanas: base, +8%, pico (+13%), descarga.
const MESOCYCLE_FACTORS = [1.0, 1.08, 1.13, 0.7];

// Banda de ritmo por tipo de sesion, expresada como multiplicador del ritmo umbral estimado.
// [rapido, lento] -> a mayor multiplicador, mas lento (mas segundos por km).
const PACE_BANDS: Record<Exclude<RunSessionType, "race_pace">, [number, number]> = {
  recovery: [1.32, 1.45],
  easy: [1.18, 1.3],
  long_run: [1.14, 1.25],
  tempo: [1.0, 1.06],
  intervals: [0.88, 0.95],
};

const HR_ZONE_BASE: Record<Exclude<RunSessionType, "race_pace">, 1 | 2 | 3 | 4 | 5> = {
  recovery: 1,
  easy: 2,
  long_run: 2,
  tempo: 4,
  intervals: 5,
};

const RPE_BY_TYPE: Record<RunSessionType, string> = {
  recovery: "2-3/10",
  easy: "3-4/10",
  long_run: "4-5/10 (constante)",
  tempo: "6-7/10",
  intervals: "8-9/10",
  race_pace: "7-8/10",
};

const TITLES: Record<RunSessionType, (km: number) => string> = {
  recovery: (km) => `Recuperacion - ${km} km`,
  easy: (km) => `Rodaje suave - ${km} km`,
  long_run: (km) => `Tirada larga - ${km} km`,
  tempo: (km) => `Tempo - ${km} km`,
  intervals: (km) => `Series - ${km} km totales`,
  race_pace: (km) => `Ritmo de carrera - ${km} km`,
};

// Ritmo objetivo de carrera como multiplicador del ritmo umbral, segun distancia objetivo.
const RACE_PACE_FACTOR: Record<GoalType, number> = {
  "5k": 0.97,
  "10k": 1.0,
  half_marathon: 1.06,
  marathon: 1.13,
  general_fitness: 1.1,
};

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function paceTarget(low: number, high: number): PaceTarget {
  const [fast, slow] = low <= high ? [low, high] : [high, low];
  return {
    minPerKmLow: Math.round(fast),
    minPerKmHigh: Math.round(slow),
    label: `${formatPace(fast)} - ${formatPace(slow)} /km`,
  };
}

function raceZone(goalType: GoalType): 1 | 2 | 3 | 4 | 5 {
  return goalType === "marathon" || goalType === "half_marathon" ? 3 : 4;
}

function hrTarget(zone: 1 | 2 | 3 | 4 | 5, maxHr: number | null): HeartRateTarget {
  const bands: Record<1 | 2 | 3 | 4 | 5, [number, number]> = {
    1: [0.5, 0.6],
    2: [0.6, 0.7],
    3: [0.7, 0.8],
    4: [0.8, 0.9],
    5: [0.9, 1.0],
  };
  const [lowP, highP] = bands[zone];
  if (!maxHr) {
    return { zone, bpmLow: null, bpmHigh: null, label: `Zona ${zone} de FC` };
  }
  const bpmLow = Math.round(maxHr * lowP);
  const bpmHigh = Math.round(maxHr * highP);
  return { zone, bpmLow, bpmHigh, label: `${bpmLow}-${bpmHigh} ppm (Z${zone})` };
}

function buildStructure(runType: RunSessionType, distanceKm: number, goalType: GoalType): string[] {
  switch (runType) {
    case "recovery":
      return [
        "Trote muy suave de principio a fin, sin mirar el ritmo.",
        `${distanceKm} km continuos, a poder ser en terreno llano.`,
        "Si notas fatiga alta, sustituye por caminar o descansar.",
      ];
    case "easy":
      return [
        "5-10 min iniciales aun mas suaves a modo de calentamiento.",
        `Completa ${distanceKm} km en ritmo comodo, con respiracion controlada.`,
        "Cadencia alta y relajada; termina sintiendo que podrias seguir.",
      ];
    case "long_run": {
      const mainBlock = Math.max(distanceKm - 2, 0).toFixed(1);
      return [
        "10 min de calentamiento progresivo.",
        `Cuerpo principal: ${mainBlock} km a ritmo constante y comodo.`,
        "Ultimos 2 km opcionales algo mas vivos si te encuentras bien (progresivo).",
        "Hidrata y repone energia si superas los 90 minutos.",
      ];
    }
    case "tempo": {
      const workKm = Math.round(distanceKm * 0.55 * 2) / 2;
      const split = workKm > 8;
      return [
        "15 min de calentamiento suave + 4 progresiones cortas.",
        split
          ? `${(workKm / 2).toFixed(1)} km a ritmo tempo + 3 min trote suave + ${(workKm / 2).toFixed(1)} km a ritmo tempo.`
          : `${workKm.toFixed(1)} km continuos a ritmo tempo (comodamente duro, sostenible).`,
        "10-15 min de vuelta a la calma trotando suave.",
      ];
    }
    case "intervals": {
      const repDistanceM = goalType === "5k" ? 400 : goalType === "marathon" ? 1000 : 600;
      const workKm = distanceKm * 0.45;
      const reps = Math.max(4, Math.round((workKm * 1000) / repDistanceM));
      const recovery = repDistanceM <= 400 ? "90 seg trote suave" : "2-3 min trote suave";
      return [
        "15-20 min de calentamiento + movilidad + 3-4 progresiones.",
        `${reps} x ${repDistanceM} m a ritmo de series, con ${recovery} entre repeticiones.`,
        "10-15 min de vuelta a la calma trotando suave.",
      ];
    }
    case "race_pace": {
      const workKm = Math.round(distanceKm * 0.5 * 2) / 2;
      return [
        "15 min de calentamiento suave.",
        `${workKm.toFixed(1)} km a ritmo objetivo de carrera, sensaciones controladas.`,
        "10 min de vuelta a la calma.",
      ];
    }
    default:
      return [];
  }
}

function buildRunSession(
  runType: RunSessionType,
  rawDistanceKm: number,
  thresholdPaceSecPerKm: number,
  maxHr: number | null,
  goalType: GoalType,
  thresholdIsEstimated: boolean,
): RunSession {
  const distanceKm = Math.max(2, Math.round(rawDistanceKm * 2) / 2);

  let low: number;
  let high: number;
  if (runType === "race_pace") {
    const factor = RACE_PACE_FACTOR[goalType];
    low = thresholdPaceSecPerKm * (factor - 0.015);
    high = thresholdPaceSecPerKm * (factor + 0.015);
  } else {
    const [lowF, highF] = PACE_BANDS[runType];
    low = thresholdPaceSecPerKm * lowF;
    high = thresholdPaceSecPerKm * highF;
  }
  const midPace = (low + high) / 2;
  const durationMinutesEstimate = Math.max(15, Math.round((distanceKm * midPace) / 60));
  const zone = runType === "race_pace" ? raceZone(goalType) : HR_ZONE_BASE[runType];

  const estimateNote = thresholdIsEstimated
    ? " (ritmos genericos de referencia: se afinaran con mas actividades sincronizadas de Strava)"
    : "";

  return {
    id: crypto.randomUUID(),
    discipline: "run",
    runType,
    title: TITLES[runType](distanceKm),
    distanceKm,
    durationMinutesEstimate,
    paceTarget: paceTarget(low, high),
    heartRateTarget: hrTarget(zone, maxHr),
    rpe: RPE_BY_TYPE[runType],
    description: `Sesion de ${TITLES[runType](distanceKm).toLowerCase()}.${estimateNote}`,
    structure: buildStructure(runType, distanceKm, goalType),
  };
}

function buildGymSession(
  focus: GymFocus,
  gymAccess: boolean,
  experienceLevel: Profile["experienceLevel"],
): GymSession {
  const exercises = pickExercises(focus, gymAccess, experienceLevel);
  const durationMinutesEstimate = Math.round(
    10 + exercises.reduce((sum, e) => sum + (e.sets * (e.restSeconds + 45)) / 60, 0),
  );
  return {
    id: crypto.randomUUID(),
    discipline: "gym",
    focus,
    title: FOCUS_LABEL[focus],
    durationMinutesEstimate,
    exercises,
    description: `Sesion de gimnasio enfocada en ${FOCUS_LABEL[focus].toLowerCase()}. Calienta 8-10 min (movilidad + activacion) antes de empezar.`,
  };
}

function buildRestDay(): RestSession {
  return {
    id: crypto.randomUUID(),
    discipline: "rest",
    title: "Descanso",
    description:
      "Dia libre de entrenamiento estructurado. Prioriza sueño, hidratacion y, si te apetece, un paseo suave o estiramientos ligeros.",
  };
}

function estimateBaselineWeeklyKm(metrics: Metrics, experienceLevel: Profile["experienceLevel"]): number {
  const recentWeeks = metrics.weeklyVolumeKm.slice(-3).filter((km) => km > 0);
  if (recentWeeks.length > 0) {
    return recentWeeks.reduce((a, b) => a + b, 0) / recentWeeks.length;
  }
  const defaults: Record<Profile["experienceLevel"], number> = {
    beginner: 12,
    intermediate: 25,
    advanced: 40,
  };
  return defaults[experienceLevel];
}

function applyAcwrSafety(factor: number, metrics: Metrics): number {
  if (metrics.acwrStatus === "high_risk") return Math.min(factor, 0.85);
  if (metrics.acwrStatus === "caution") return Math.min(factor, 1.0);
  return factor;
}

type TaperPhase = "race_week" | "taper" | null;

function taperPhase(profile: Profile, weekStart: Date): TaperPhase {
  if (!profile.raceDate || profile.goalType === "general_fitness") return null;
  const race = new Date(profile.raceDate);
  const diffDays = Math.floor((race.getTime() - weekStart.getTime()) / DAY_MS);
  if (diffDays < 0) return null;
  if (diffDays <= 6) return "race_week";
  if (diffDays <= 13) return "taper";
  return null;
}

function gymFocusRotation(gymDaysPerWeek: number, mesocycleWeek: number, downshift: boolean): GymFocus[] {
  if (gymDaysPerWeek <= 0) return [];
  if (downshift) {
    const deloadRotation: GymFocus[] = ["mobility", "lower_stability", "upper_core", "mobility"];
    return deloadRotation.slice(0, gymDaysPerWeek);
  }
  const full: GymFocus[] = ["lower_power", "upper_core", "lower_stability", "mobility"];
  if (gymDaysPerWeek === 1) {
    return [full[(mesocycleWeek - 1) % full.length]];
  }
  return full.slice(0, gymDaysPerWeek);
}

interface DayRole {
  run?: RunSessionType;
  gym?: GymFocus;
}

function buildDayRoles(profile: Profile, mesocycleWeek: number, isDeload: boolean, phase: TaperPhase): DayRole[] {
  const roles: DayRole[] = Array.from({ length: 7 }, () => ({}));
  const runDays = Math.min(6, Math.max(2, profile.runDaysPerWeek));
  const gymDays = Math.min(4, Math.max(0, profile.gymDaysPerWeek));

  // 1. Tirada larga -> domingo, salvo en la semana de la carrera (se sustituye por un rodaje corto de activacion).
  if (phase === "race_week") {
    roles[3].run = "easy";
  } else {
    roles[6].run = "long_run";
  }

  // 2. Sesion de calidad (tempo/intervalos), si procede.
  const wantsQuality = runDays >= 3 && !isDeload && phase !== "race_week";
  if (wantsQuality) {
    roles[2].run = mesocycleWeek % 2 === 1 ? "tempo" : "intervals";
  } else if (phase === "taper" && runDays >= 3) {
    roles[2].run = "race_pace";
  }

  // 3. Resto de dias de carrera (easy/recovery) en huecos preferidos, repartidos por la semana.
  let remainingRuns = runDays - Object.values(roles).filter((r) => r.run).length;
  const easyPreference = [0, 4, 1, 3, 5]; // Lun, Vie, Mar, Jue, Sab
  let usedRecovery = false;
  for (const idx of easyPreference) {
    if (remainingRuns <= 0) break;
    if (roles[idx].run) continue;
    if (!usedRecovery && runDays >= 5 && idx === 3) {
      roles[idx].run = "recovery";
      usedRecovery = true;
    } else {
      roles[idx].run = "easy";
    }
    remainingRuns -= 1;
  }

  // 4. Dias de gimnasio: preferimos huecos sin carrera; si faltan, se combinan con dias de rodaje suave.
  const focuses = gymFocusRotation(gymDays, mesocycleWeek, isDeload || phase === "race_week");
  const gymPreferenceFree = [1, 3, 0, 4, 5]; // Mar, Jue, Lun, Vie, Sab
  const assignedGymDays: number[] = [];
  for (const idx of gymPreferenceFree) {
    if (assignedGymDays.length >= focuses.length) break;
    if (!roles[idx].run) assignedGymDays.push(idx);
  }
  if (assignedGymDays.length < focuses.length) {
    for (const idx of easyPreference) {
      if (assignedGymDays.length >= focuses.length) break;
      if (roles[idx].run === "easy" && !assignedGymDays.includes(idx)) assignedGymDays.push(idx);
    }
  }

  focuses.forEach((focus, i) => {
    const idx = assignedGymDays[i];
    if (idx === undefined) return;
    // Seguridad: evita fuerza pesada de tren inferior el dia antes del largo (sab) o de la calidad (mar).
    const riskyEve = idx === 5 || idx === 1;
    if (riskyEve && (focus === "lower_power" || focus === "lower_stability")) {
      roles[idx].gym = "upper_core";
    } else {
      roles[idx].gym = focus;
    }
  });

  return roles;
}

function distributeRunDistances(
  roles: DayRole[],
  totalKm: number,
  longestRecentRunKm: number,
  phase: TaperPhase,
): Map<number, number> {
  const distances = new Map<number, number>();
  const longIdx = roles.findIndex((r) => r.run === "long_run");
  const qualityIdx = roles.findIndex(
    (r) => r.run === "tempo" || r.run === "intervals" || r.run === "race_pace",
  );
  const runIdx = roles.map((r, i) => ({ r, i })).filter(({ r }) => r.run);
  const otherIdx = runIdx.filter(({ i }) => i !== longIdx && i !== qualityIdx).map(({ i }) => i);

  if (longIdx >= 0) {
    const runCount = runIdx.length;
    const share = runCount <= 3 ? 0.38 : runCount <= 5 ? 0.3 : 0.25;
    let longKm = totalKm * share;
    if (longestRecentRunKm > 0 && phase === null) {
      longKm = Math.min(longKm, longestRecentRunKm + 3);
    }
    distances.set(longIdx, longKm);
  }
  if (qualityIdx >= 0) {
    distances.set(qualityIdx, totalKm * 0.2);
  }
  const assignedKm = Array.from(distances.values()).reduce((a, b) => a + b, 0);
  const remainingKm = Math.max(0, totalKm - assignedKm);
  const perOther = otherIdx.length > 0 ? remainingKm / otherIdx.length : 0;
  otherIdx.forEach((idx) => {
    const factor = roles[idx].run === "recovery" ? 0.8 : 1.0;
    distances.set(idx, perOther * factor);
  });

  return distances;
}

function buildSummary(
  metrics: Metrics,
  mesocycleWeek: number,
  isDeload: boolean,
  phase: TaperPhase,
  totalRunningKmTarget: number,
  weeklyLoadTrend: WeeklyPlan["weeklyLoadTrend"],
): string {
  const parts: string[] = [];
  if (phase === "race_week") {
    parts.push("Semana de la carrera: volumen minimo, foco en llegar descansado y fresco al dia clave.");
  } else if (phase === "taper") {
    parts.push(
      "Fase de puesta a punto (taper): reducimos volumen manteniendo algo de intensidad para llegar fresco a la carrera.",
    );
  } else if (isDeload) {
    parts.push(
      `Semana ${mesocycleWeek} de 4: descarga. Bajamos la carga para asimilar el bloque y prevenir el sobreentrenamiento.`,
    );
  } else {
    const trendText =
      weeklyLoadTrend === "increase"
        ? "progresion de volumen"
        : weeklyLoadTrend === "reduce"
          ? "reduccion de carga por señales de fatiga"
          : "mantenimiento de la carga actual";
    parts.push(`Semana ${mesocycleWeek} de 4 del mesociclo actual, orientada a ${trendText}.`);
  }
  parts.push(`Objetivo de kilometraje de carrera: ${totalRunningKmTarget} km.`);
  if (metrics.acwrStatus === "high_risk") {
    parts.push(
      "Tu ratio de carga aguda:cronica (ACWR) esta en zona de riesgo alto; hemos recortado la progresion para protegerte de lesiones.",
    );
  } else if (metrics.acwrStatus === "caution") {
    parts.push("Tu ACWR esta en zona de precaucion; mantenemos el volumen sin aumentarlo esta semana.");
  }
  if (metrics.thresholdPaceSecPerKm == null) {
    parts.push(
      "Aun no hay carreras recientes suficientes para calcular tu ritmo umbral real: usamos un ritmo generico que se ajustara segun sincronices mas actividades.",
    );
  }
  return parts.join(" ");
}

export function generateWeeklyPlan(
  profile: Profile,
  metrics: Metrics,
  referenceDate: Date = new Date(),
): WeeklyPlan {
  const weekStart = startOfIsoWeek(referenceDate);
  const programStart = startOfIsoWeek(new Date(profile.programStartDate));
  const weeksSinceStart = Math.max(
    0,
    Math.round((weekStart.getTime() - programStart.getTime()) / (7 * DAY_MS)),
  );
  const mesocycleWeek = ((((weeksSinceStart % 4) + 4) % 4) + 1) as 1 | 2 | 3 | 4;
  const isDeload = mesocycleWeek === 4;
  const phase = taperPhase(profile, weekStart);

  const baselineKm = estimateBaselineWeeklyKm(metrics, profile.experienceLevel);
  let factor = MESOCYCLE_FACTORS[mesocycleWeek - 1];
  factor = applyAcwrSafety(factor, metrics);
  if (phase === "taper") factor = Math.min(factor, 0.75);
  if (phase === "race_week") factor = Math.min(factor, 0.45);

  const totalRunningKmTarget = Math.round(baselineKm * factor * 2) / 2;
  const weeklyLoadTrend: WeeklyPlan["weeklyLoadTrend"] =
    factor > 1.02 ? "increase" : factor < 0.95 ? "reduce" : "maintain";

  const roles = buildDayRoles(profile, mesocycleWeek, isDeload, phase);
  const distances = distributeRunDistances(roles, totalRunningKmTarget, metrics.longestRecentRunKm, phase);
  const threshold = metrics.thresholdPaceSecPerKm ?? 360;
  const thresholdIsEstimated = metrics.thresholdPaceSecPerKm == null;

  const days: DaySchedule[] = roles.map((role, idx) => {
    const date = new Date(weekStart.getTime() + idx * DAY_MS);
    const sessions: PlanSession[] = [];
    if (role.run) {
      sessions.push(
        buildRunSession(
          role.run,
          distances.get(idx) ?? 4,
          threshold,
          profile.maxHeartRate,
          profile.goalType,
          thresholdIsEstimated,
        ),
      );
    }
    if (role.gym) {
      sessions.push(buildGymSession(role.gym, profile.gymAccess, profile.experienceLevel));
    }
    if (sessions.length === 0) {
      sessions.push(buildRestDay());
    }
    return { date: isoDateOnly(date), dayOfWeek: idx, sessions, completed: false };
  });

  const summary = buildSummary(metrics, mesocycleWeek, isDeload, phase, totalRunningKmTarget, weeklyLoadTrend);

  return {
    id: crypto.randomUUID(),
    userId: profile.userId,
    weekStartDate: isoDateOnly(weekStart),
    mesocycleWeek,
    isDeloadWeek: isDeload,
    totalRunningKmTarget,
    weeklyLoadTrend,
    summary,
    days,
    generatedAt: new Date().toISOString(),
  };
}

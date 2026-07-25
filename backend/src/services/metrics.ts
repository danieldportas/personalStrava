import type { Metrics, StoredActivity } from "../types";

const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun"]);
const DAY_MS = 24 * 60 * 60 * 1000;

function isRun(a: StoredActivity): boolean {
  return RUN_TYPES.has(a.type);
}

/** Lunes 00:00 de la semana ISO a la que pertenece `date`. */
function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0=domingo..6=sabado
  const diffToMonday = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d;
}

function isoDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Carga de entrenamiento aproximada de una actividad.
 * Usa el "suffer score" de Strava (basado en FC) cuando esta disponible, que es
 * el proxy mas fiable de esfuerzo real. Si no, cae a una heurística basada en
 * distancia/duracion + desnivel, similar a un TRIMP simplificado.
 */
function activityLoad(a: StoredActivity): number {
  if (a.sufferScore != null) return a.sufferScore;

  const movingMinutes = a.movingTimeSeconds / 60;
  if (isRun(a)) {
    const distanceKm = a.distanceMeters / 1000;
    const climbLoad = a.elevationGainMeters / 50;
    return distanceKm * 10 + climbLoad;
  }
  // Gimnasio u otra actividad: carga moderada proporcional a la duracion.
  return movingMinutes * 0.6;
}

export function computeMetrics(activities: StoredActivity[]): Metrics {
  const now = new Date();
  const currentWeekStart = startOfIsoWeek(now);

  // --- Volumen semanal de carrera (ultimas 8 semanas, incluida la actual) ---
  const weeklyVolumeKm: number[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const weekStart = new Date(currentWeekStart.getTime() - i * 7 * DAY_MS);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const km = activities
      .filter(isRun)
      .filter((a) => {
        const t = new Date(a.startDate).getTime();
        return t >= weekStart.getTime() && t < weekEnd.getTime();
      })
      .reduce((sum, a) => sum + a.distanceMeters / 1000, 0);
    weeklyVolumeKm.push(Number(km.toFixed(1)));
  }
  const currentWeekKm = weeklyVolumeKm[weeklyVolumeKm.length - 1] ?? 0;

  // --- Carga aguda:cronica (ACWR) ---
  const sinceAcute = now.getTime() - 7 * DAY_MS;
  const sinceChronic = now.getTime() - 28 * DAY_MS;

  const acuteLoad = activities
    .filter((a) => new Date(a.startDate).getTime() >= sinceAcute)
    .reduce((sum, a) => sum + activityLoad(a), 0);

  const chronicLoadTotal = activities
    .filter((a) => new Date(a.startDate).getTime() >= sinceChronic)
    .reduce((sum, a) => sum + activityLoad(a), 0);
  const chronicLoad = chronicLoadTotal / 4; // media semanal de las ultimas 4 semanas

  let acwr: number;
  if (chronicLoad < 1) {
    acwr = acuteLoad > 0 ? 1.5 : 0;
  } else {
    acwr = acuteLoad / chronicLoad;
  }

  let acwrStatus: Metrics["acwrStatus"];
  if (acwr < 0.8) acwrStatus = "detraining";
  else if (acwr <= 1.3) acwrStatus = "optimal";
  else if (acwr <= 1.5) acwrStatus = "caution";
  else acwrStatus = "high_risk";

  // --- Ritmo umbral estimado (a partir del mejor esfuerzo sostenido reciente) ---
  const sinceThreshold = now.getTime() - 90 * DAY_MS;
  const qualifyingRuns = activities.filter(
    (a) =>
      isRun(a) &&
      a.distanceMeters >= 5000 &&
      a.averagePaceSecPerKm != null &&
      new Date(a.startDate).getTime() >= sinceThreshold,
  );
  const fallbackRuns = activities.filter(
    (a) =>
      isRun(a) &&
      a.distanceMeters >= 3000 &&
      a.averagePaceSecPerKm != null &&
      new Date(a.startDate).getTime() >= sinceThreshold,
  );
  const pool = qualifyingRuns.length > 0 ? qualifyingRuns : fallbackRuns;
  const thresholdPaceSecPerKm =
    pool.length > 0
      ? Math.min(...pool.map((a) => a.averagePaceSecPerKm as number))
      : null;

  // --- Carrera larga reciente (referencia para progresion del long run) ---
  const sinceLongRun = now.getTime() - 21 * DAY_MS;
  const longestRecentRunKm = activities
    .filter((a) => isRun(a) && new Date(a.startDate).getTime() >= sinceLongRun)
    .reduce((max, a) => Math.max(max, a.distanceMeters / 1000), 0);

  return {
    weeklyVolumeKm,
    currentWeekKm,
    acuteLoad: Number(acuteLoad.toFixed(1)),
    chronicLoad: Number(chronicLoad.toFixed(1)),
    acwr: Number(acwr.toFixed(2)),
    acwrStatus,
    thresholdPaceSecPerKm: thresholdPaceSecPerKm != null ? Math.round(thresholdPaceSecPerKm) : null,
    longestRecentRunKm: Number(longestRecentRunKm.toFixed(1)),
    totalActivities: activities.length,
    computedAt: isoDateOnly(now),
  };
}

export { startOfIsoWeek, isoDateOnly };

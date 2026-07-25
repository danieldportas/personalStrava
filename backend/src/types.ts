export type GoalType = "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Profile {
  userId: string;
  goalType: GoalType;
  raceDate: string | null; // ISO date, opcional
  runDaysPerWeek: number; // 2-6
  gymDaysPerWeek: number; // 0-4
  gymAccess: boolean; // false = solo peso corporal
  experienceLevel: ExperienceLevel;
  maxHeartRate: number | null; // si se conoce, mejora las zonas de FC
  programStartDate: string; // ISO date, ancla del mesociclo de 4 semanas
  updatedAt: string;
}

export interface User {
  id: string;
  stravaAthleteId: number;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number; // epoch seconds
  sessionToken: string;
  createdAt: string;
}

export interface StoredActivity {
  id: string; // strava id como string
  userId: string;
  type: string; // "Run", "WeightTraining", etc.
  name: string;
  startDate: string; // ISO
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationGainMeters: number;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averagePaceSecPerKm: number | null;
  sufferScore: number | null;
}

export type SessionDiscipline = "run" | "gym" | "rest";

export type RunSessionType =
  | "easy"
  | "recovery"
  | "long_run"
  | "tempo"
  | "intervals"
  | "race_pace";

export type GymFocus = "lower_power" | "lower_stability" | "upper_core" | "mobility";

export interface PaceTarget {
  minPerKmLow: number; // segundos/km (mas rapido)
  minPerKmHigh: number; // segundos/km (mas lento)
  label: string; // "5:10 - 5:30 /km"
}

export interface HeartRateTarget {
  zone: 1 | 2 | 3 | 4 | 5;
  bpmLow: number | null;
  bpmHigh: number | null;
  label: string;
}

export interface RunSession {
  id: string;
  discipline: "run";
  runType: RunSessionType;
  title: string;
  distanceKm: number;
  durationMinutesEstimate: number;
  paceTarget: PaceTarget;
  heartRateTarget: HeartRateTarget;
  rpe: string; // "3-4/10"
  description: string;
  structure: string[]; // pasos de la sesion (calentamiento, series, etc.)
}

export interface GymExerciseInstance {
  name: string;
  sets: number;
  reps: string; // "10-12" o "30s"
  restSeconds: number;
  notes: string;
}

export interface GymSession {
  id: string;
  discipline: "gym";
  focus: GymFocus;
  title: string;
  durationMinutesEstimate: number;
  exercises: GymExerciseInstance[];
  description: string;
}

export interface RestSession {
  id: string;
  discipline: "rest";
  title: string;
  description: string;
}

export type PlanSession = RunSession | GymSession | RestSession;

export interface DaySchedule {
  date: string; // ISO date
  dayOfWeek: number; // 0=lunes .. 6=domingo
  sessions: PlanSession[];
  completed: boolean;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string; // ISO date (lunes)
  mesocycleWeek: 1 | 2 | 3 | 4;
  isDeloadWeek: boolean;
  totalRunningKmTarget: number;
  weeklyLoadTrend: "increase" | "maintain" | "reduce";
  summary: string;
  days: DaySchedule[];
  generatedAt: string;
}

export interface Metrics {
  weeklyVolumeKm: number[]; // ultimas 8 semanas, mas reciente al final
  currentWeekKm: number;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number; // acute:chronic workload ratio
  acwrStatus: "detraining" | "optimal" | "caution" | "high_risk";
  thresholdPaceSecPerKm: number | null;
  longestRecentRunKm: number;
  totalActivities: number;
  computedAt: string;
}

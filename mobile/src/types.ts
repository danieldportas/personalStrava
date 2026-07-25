export type GoalType = "5k" | "10k" | "half_marathon" | "marathon" | "general_fitness";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface Profile {
  userId: string;
  goalType: GoalType;
  raceDate: string | null;
  runDaysPerWeek: number;
  gymDaysPerWeek: number;
  gymAccess: boolean;
  experienceLevel: ExperienceLevel;
  maxHeartRate: number | null;
  programStartDate: string;
  updatedAt: string;
}

export interface StoredActivity {
  id: string;
  userId: string;
  type: string;
  name: string;
  startDate: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  elevationGainMeters: number;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averagePaceSecPerKm: number | null;
  sufferScore: number | null;
}

export type RunSessionType = "easy" | "recovery" | "long_run" | "tempo" | "intervals" | "race_pace";
export type GymFocus = "lower_power" | "lower_stability" | "upper_core" | "mobility";

export interface PaceTarget {
  minPerKmLow: number;
  minPerKmHigh: number;
  label: string;
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
  rpe: string;
  description: string;
  structure: string[];
}

export interface GymExerciseInstance {
  name: string;
  sets: number;
  reps: string;
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
  date: string;
  dayOfWeek: number;
  sessions: PlanSession[];
  completed: boolean;
}

export interface WeeklyPlan {
  id: string;
  userId: string;
  weekStartDate: string;
  mesocycleWeek: 1 | 2 | 3 | 4;
  isDeloadWeek: boolean;
  totalRunningKmTarget: number;
  weeklyLoadTrend: "increase" | "maintain" | "reduce";
  summary: string;
  days: DaySchedule[];
  generatedAt: string;
}

export interface Metrics {
  weeklyVolumeKm: number[];
  currentWeekKm: number;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number;
  acwrStatus: "detraining" | "optimal" | "caution" | "high_risk";
  thresholdPaceSecPerKm: number | null;
  longestRecentRunKm: number;
  totalActivities: number;
  computedAt: string;
}

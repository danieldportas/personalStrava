import type { ExperienceLevel, GymExerciseInstance, GymFocus } from "../types";

interface ExerciseDef {
  name: string;
  sets: number;
  reps: string;
  restSeconds: number;
  notes: string;
  requiresGym: boolean;
}

/**
 * Libreria de fuerza orientada a corredores: fuerza/potencia de tren inferior,
 * estabilidad/unilateral (prevencion de lesiones), core/tren superior y movilidad.
 * Cada foco tiene variantes de gimnasio y de peso corporal para poder generar
 * un plan aunque el usuario no tenga acceso a gimnasio.
 */
const LIBRARY: Record<GymFocus, ExerciseDef[]> = {
  lower_power: [
    { name: "Sentadilla trasera", sets: 4, reps: "5-6", restSeconds: 120, notes: "Carga progresiva, tecnica antes que peso.", requiresGym: true },
    { name: "Peso muerto rumano", sets: 3, reps: "6-8", restSeconds: 120, notes: "Enfoque en isquiotibiales y cadena posterior.", requiresGym: true },
    { name: "Zancada con barra o mancuernas", sets: 3, reps: "8 por pierna", restSeconds: 90, notes: "Paso controlado, rodilla alineada con el pie.", requiresGym: true },
    { name: "Prensa de piernas", sets: 3, reps: "8-10", restSeconds: 90, notes: "Rango completo, sin bloquear rodilla.", requiresGym: true },
    { name: "Sentadilla bulgara a una pierna", sets: 3, reps: "8-10 por pierna", restSeconds: 90, notes: "Con mochila o mancuernas si no hay gimnasio.", requiresGym: false },
    { name: "Zancadas con salto", sets: 3, reps: "8 por pierna", restSeconds: 90, notes: "Enfasis en potencia de salida.", requiresGym: false },
    { name: "Sentadilla a una pierna en banco (pistol asistido)", sets: 3, reps: "6-8 por pierna", restSeconds: 90, notes: "Progresion de fuerza unilateral sin carga externa.", requiresGym: false },
  ],
  lower_stability: [
    { name: "Peso muerto a una pierna con mancuerna", sets: 3, reps: "8 por pierna", restSeconds: 75, notes: "Cadera estable, mirada al frente.", requiresGym: true },
    { name: "Step-up con carga", sets: 3, reps: "8 por pierna", restSeconds: 75, notes: "Banco a altura de rodilla.", requiresGym: true },
    { name: "Elevacion de gemelo a una pierna", sets: 3, reps: "12-15 por pierna", restSeconds: 60, notes: "Clave para prevenir lesiones de Aquiles/gemelo.", requiresGym: false },
    { name: "Puente de gluteo a una pierna", sets: 3, reps: "12 por pierna", restSeconds: 60, notes: "Aprieta el gluteo arriba 1-2s.", requiresGym: false },
    { name: "Monster walk con banda elastica", sets: 3, reps: "15 pasos por lado", restSeconds: 60, notes: "Activacion de gluteo medio.", requiresGym: false },
    { name: "Equilibrio a una pierna con movimiento de brazos", sets: 3, reps: "30-45s por lado", restSeconds: 45, notes: "Propiocepcion de tobillo, ideal post-lesion.", requiresGym: false },
  ],
  upper_core: [
    { name: "Press banca o press con mancuernas", sets: 3, reps: "8-10", restSeconds: 90, notes: "Postura de carrera: torso estable.", requiresGym: true },
    { name: "Remo con barra o maquina", sets: 3, reps: "8-10", restSeconds: 90, notes: "Escapulas activas, evita balanceo.", requiresGym: true },
    { name: "Plancha frontal", sets: 3, reps: "40-60s", restSeconds: 45, notes: "Cadera neutra, no dejar caer la zona lumbar.", requiresGym: false },
    { name: "Plancha lateral", sets: 3, reps: "30-40s por lado", restSeconds: 45, notes: "Clave para estabilidad pelvica al correr.", requiresGym: false },
    { name: "Pallof press (anti-rotacion)", sets: 3, reps: "10-12 por lado", restSeconds: 60, notes: "Con banda elastica o polea.", requiresGym: false },
    { name: "Dead bug", sets: 3, reps: "10 por lado", restSeconds: 45, notes: "Control de core sin compensar con lumbar.", requiresGym: false },
    { name: "Fondos en banco / flexiones", sets: 3, reps: "10-15", restSeconds: 60, notes: "Fuerza de tren superior complementaria.", requiresGym: false },
  ],
  mobility: [
    { name: "Movilidad de cadera 90/90", sets: 2, reps: "8 por lado", restSeconds: 30, notes: "Rango de rotacion interna/externa.", requiresGym: false },
    { name: "Zancada con giro de tronco (world's greatest stretch)", sets: 2, reps: "6 por lado", restSeconds: 30, notes: "Calienta cadera, isquios y torax.", requiresGym: false },
    { name: "Estiramiento dinamico de gemelo en pared", sets: 2, reps: "8 por lado", restSeconds: 20, notes: "Rodilla extendida y flexionada.", requiresGym: false },
    { name: "Rodillas al pecho caminando", sets: 2, reps: "10 pasos por lado", restSeconds: 20, notes: "Activacion de flexores de cadera.", requiresGym: false },
    { name: "Foam roller: gemelo, cuadriceps, isquios", sets: 1, reps: "60s por zona", restSeconds: 0, notes: "Liberacion miofascial post o pre carrera suave.", requiresGym: false },
    { name: "Talones al gluteo skipping suave", sets: 2, reps: "20m", restSeconds: 20, notes: "Activacion neuromuscular.", requiresGym: false },
  ],
};

const EXPERIENCE_COUNT: Record<ExperienceLevel, number> = {
  beginner: 4,
  intermediate: 5,
  advanced: 6,
};

export function pickExercises(
  focus: GymFocus,
  gymAccess: boolean,
  experienceLevel: ExperienceLevel,
): GymExerciseInstance[] {
  const pool = LIBRARY[focus].filter((e) => gymAccess || !e.requiresGym);
  const count = Math.min(EXPERIENCE_COUNT[experienceLevel], pool.length);

  // Selección determinista (no aleatoria) para que el plan sea reproducible:
  // prioriza los primeros ejercicios de la lista (ordenados por relevancia).
  return pool.slice(0, count).map((e) => ({
    name: e.name,
    sets: e.sets,
    reps: e.reps,
    restSeconds: e.restSeconds,
    notes: e.notes,
  }));
}

export const FOCUS_LABEL: Record<GymFocus, string> = {
  lower_power: "Fuerza y potencia de tren inferior",
  lower_stability: "Estabilidad unilateral y prevencion de lesiones",
  upper_core: "Tren superior y core",
  mobility: "Movilidad y activacion",
};

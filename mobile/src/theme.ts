export const colors = {
  background: "#0B0D10",
  surface: "#161A1F",
  surfaceAlt: "#1F252C",
  border: "#2A3038",
  primary: "#FC4C02", // naranja Strava
  primaryMuted: "#5C2A12",
  text: "#F5F6F7",
  textMuted: "#9AA3AD",
  success: "#3DDC84",
  warning: "#F5B942",
  danger: "#FF5A5F",
  run: "#4C9AFF",
  gym: "#B98CFF",
  rest: "#5C6773",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 20,
};

export const typography = {
  title: { fontSize: 26, fontWeight: "700" as const, color: colors.text },
  subtitle: { fontSize: 17, fontWeight: "600" as const, color: colors.text },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.text },
  caption: { fontSize: 13, fontWeight: "400" as const, color: colors.textMuted },
  label: { fontSize: 12, fontWeight: "600" as const, color: colors.textMuted, letterSpacing: 0.5 },
};

export function disciplineColor(discipline: "run" | "gym" | "rest"): string {
  if (discipline === "run") return colors.run;
  if (discipline === "gym") return colors.gym;
  return colors.rest;
}

export const DAY_LABELS_ES = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
export const DAY_LABELS_SHORT_ES = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

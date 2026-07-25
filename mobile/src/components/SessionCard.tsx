import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, disciplineColor, radius, spacing, typography } from "../theme";
import type { PlanSession } from "../types";

function sessionSubtitle(session: PlanSession): string {
  if (session.discipline === "run") {
    return `${session.distanceKm} km · ${session.durationMinutesEstimate} min · ${session.paceTarget.label}`;
  }
  if (session.discipline === "gym") {
    return `${session.exercises.length} ejercicios · ${session.durationMinutesEstimate} min`;
  }
  return "Dia de recuperacion";
}

function disciplineIcon(session: PlanSession): string {
  if (session.discipline === "run") return "🏃";
  if (session.discipline === "gym") return "🏋️";
  return "🛌";
}

export function SessionCard({
  session,
  completed,
  onPress,
}: {
  session: PlanSession;
  completed?: boolean;
  onPress?: () => void;
}) {
  const accent = disciplineColor(session.discipline);
  return (
    <Pressable style={[styles.card, { borderLeftColor: accent }]} onPress={onPress} disabled={!onPress}>
      <Text style={styles.icon}>{disciplineIcon(session)}</Text>
      <View style={styles.textCol}>
        <Text style={[typography.subtitle, completed && styles.strikethrough]}>{session.title}</Text>
        <Text style={typography.caption}>{sessionSubtitle(session)}</Text>
      </View>
      {completed && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  icon: { fontSize: 22 },
  textCol: { flex: 1, gap: 2 },
  strikethrough: { textDecorationLine: "line-through", color: colors.textMuted },
  check: { color: colors.success, fontSize: 18, fontWeight: "700" },
});

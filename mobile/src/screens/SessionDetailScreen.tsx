import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "../api/client";
import { useCurrentPlan } from "../api/hooks";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, disciplineColor, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "SessionDetail">;

export function SessionDetailScreen({ route }: Props) {
  const { sessionId, date } = route.params;
  const { sessionToken } = useAuth();
  const plan = useCurrentPlan();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const day = plan.data?.days.find((d) => d.date === date);
  const session = day?.sessions.find((s) => s.id === sessionId);

  if (plan.loading && !session) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!session || !day) {
    return (
      <View style={styles.center}>
        <Text style={typography.body}>No se encontro la sesion.</Text>
      </View>
    );
  }

  const toggleCompleted = async () => {
    if (!sessionToken) return;
    setSaving(true);
    setError(null);
    try {
      await api.setSessionCompleted(sessionToken, sessionId, !day.completed);
      await plan.refetch();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo actualizar la sesion.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <View style={[styles.headerBar, { backgroundColor: disciplineColor(session.discipline) }]} />
      <Text style={typography.title}>{session.title}</Text>
      <Text style={[typography.body, styles.description]}>{session.description}</Text>

      {session.discipline === "run" && (
        <View style={styles.metricsRow}>
          <Metric label="Distancia" value={`${session.distanceKm} km`} />
          <Metric label="Duracion aprox." value={`${session.durationMinutesEstimate} min`} />
          <Metric label="Ritmo" value={session.paceTarget.label} />
          <Metric label="FC" value={session.heartRateTarget.label} />
          <Metric label="RPE" value={session.rpe} />
        </View>
      )}

      {session.discipline === "run" && (
        <View style={styles.section}>
          <Text style={typography.subtitle}>Estructura</Text>
          {session.structure.map((step, i) => (
            <Text key={i} style={[typography.body, styles.step]}>
              {i + 1}. {step}
            </Text>
          ))}
        </View>
      )}

      {session.discipline === "gym" && (
        <View style={styles.section}>
          <Text style={typography.subtitle}>Ejercicios ({session.durationMinutesEstimate} min aprox.)</Text>
          {session.exercises.map((ex, i) => (
            <View key={i} style={styles.exerciseRow}>
              <Text style={typography.body}>{ex.name}</Text>
              <Text style={typography.caption}>
                {ex.sets} x {ex.reps} · descanso {ex.restSeconds}s
              </Text>
              {ex.notes ? <Text style={styles.exerciseNotes}>{ex.notes}</Text> : null}
            </View>
          ))}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={[styles.button, day.completed && styles.buttonDone]} onPress={toggleCompleted} disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>{day.completed ? "Marcado como completado ✓" : "Marcar dia como completado"}</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={typography.caption}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  headerBar: { height: 6, borderRadius: 3, marginBottom: spacing.md, width: 48 },
  description: { color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginBottom: spacing.lg },
  metric: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: "45%",
  },
  metricValue: { color: colors.text, fontWeight: "700", fontSize: 15, marginTop: 2 },
  section: { marginBottom: spacing.lg, gap: spacing.sm },
  step: { color: colors.textMuted },
  exerciseRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 2,
  },
  exerciseNotes: { color: colors.textMuted, fontSize: 12, fontStyle: "italic" },
  error: { color: colors.danger, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonDone: { backgroundColor: colors.success },
  buttonText: { color: colors.text, fontWeight: "700" },
});

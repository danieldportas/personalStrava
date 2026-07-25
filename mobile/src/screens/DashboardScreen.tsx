import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { api, ApiError } from "../api/client";
import { useCurrentPlan, useMetrics, useProfile } from "../api/hooks";
import { SessionCard } from "../components/SessionCard";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing, typography } from "../theme";
import { isoDateOnly } from "../utils/date";

type Props = NativeStackScreenProps<RootStackParamList, "Dashboard">;

const ACWR_LABEL: Record<string, { text: string; color: string }> = {
  detraining: { text: "Carga baja", color: colors.textMuted },
  optimal: { text: "Carga optima", color: colors.success },
  caution: { text: "Precaucion", color: colors.warning },
  high_risk: { text: "Riesgo alto", color: colors.danger },
};

export function DashboardScreen({ navigation }: Props) {
  const { sessionToken } = useAuth();
  const metrics = useMetrics();
  const plan = useCurrentPlan();
  const profile = useProfile();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleSync = async () => {
    if (!sessionToken) return;
    setSyncing(true);
    setSyncError(null);
    try {
      await api.syncActivities(sessionToken);
      await Promise.all([metrics.refetch(), plan.refetch()]);
    } catch (err) {
      setSyncError(err instanceof ApiError ? err.message : "No se pudo sincronizar con Strava.");
    } finally {
      setSyncing(false);
    }
  };

  const todayIso = isoDateOnly(new Date());
  const today = plan.data?.days.find((d) => d.date === todayIso);
  const maxWeekKm = Math.max(1, ...(metrics.data?.weeklyVolumeKm ?? [1]));

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={syncing}
          onRefresh={handleSync}
          tintColor={colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={typography.title}>Hola 👋</Text>
        <Pressable onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.settingsLink}>Ajustes</Text>
        </Pressable>
      </View>

      <Pressable style={styles.syncButton} onPress={handleSync} disabled={syncing}>
        {syncing ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.syncButtonText}>Sincronizar con Strava</Text>
        )}
      </Pressable>
      {syncError && <Text style={styles.error}>{syncError}</Text>}

      {metrics.data && (
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={typography.subtitle}>Carga de entrenamiento</Text>
            <View
              style={[
                styles.badge,
                { backgroundColor: ACWR_LABEL[metrics.data.acwrStatus]?.color ?? colors.textMuted },
              ]}
            >
              <Text style={styles.badgeText}>{ACWR_LABEL[metrics.data.acwrStatus]?.text ?? metrics.data.acwrStatus}</Text>
            </View>
          </View>
          <Text style={typography.caption}>
            ACWR {metrics.data.acwr.toFixed(2)} · {metrics.data.currentWeekKm} km esta semana
          </Text>

          <View style={styles.chartRow}>
            {metrics.data.weeklyVolumeKm.map((km, i) => (
              <View key={i} style={styles.chartBarWrap}>
                <View
                  style={[
                    styles.chartBar,
                    { height: Math.max(4, (km / maxWeekKm) * 70) },
                  ]}
                />
              </View>
            ))}
          </View>

          {metrics.data.thresholdPaceSecPerKm && (
            <Text style={[typography.caption, styles.mt]}>
              Ritmo umbral estimado: {formatPace(metrics.data.thresholdPaceSecPerKm)} /km
            </Text>
          )}
        </View>
      )}

      <View style={styles.cardHeaderRow}>
        <Text style={typography.subtitle}>Hoy</Text>
        <Pressable onPress={() => navigation.navigate("WeeklyPlan")}>
          <Text style={styles.settingsLink}>Ver semana</Text>
        </Pressable>
      </View>

      {plan.loading && <ActivityIndicator color={colors.primary} style={styles.mt} />}
      {plan.error && <Text style={styles.error}>{plan.error}</Text>}
      {today?.sessions.map((session) => (
        <SessionCard
          key={session.id}
          session={session}
          completed={today.completed}
          onPress={() => navigation.navigate("SessionDetail", { sessionId: session.id, date: today.date })}
        />
      ))}

      {plan.data && (
        <Text style={[typography.caption, styles.summary]}>{plan.data.summary}</Text>
      )}

      {profile.data?.goalType && (
        <Text style={[typography.caption, styles.mt]}>
          Objetivo: {GOAL_LABELS[profile.data.goalType] ?? profile.data.goalType}
        </Text>
      )}
    </ScrollView>
  );
}

const GOAL_LABELS: Record<string, string> = {
  "5k": "5K",
  "10k": "10K",
  half_marathon: "Media maraton",
  marathon: "Maraton",
  general_fitness: "Forma fisica general",
};

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.md },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingsLink: { color: colors.primary, fontWeight: "600" },
  syncButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  syncButtonText: { color: colors.primary, fontWeight: "700" },
  error: { color: colors.danger },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.lg },
  badgeText: { color: colors.background, fontWeight: "700", fontSize: 12 },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    height: 80,
    marginTop: spacing.sm,
  },
  chartBarWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  chartBar: { width: "100%", backgroundColor: colors.primary, borderRadius: 4 },
  mt: { marginTop: spacing.sm },
  summary: { marginTop: spacing.sm },
});

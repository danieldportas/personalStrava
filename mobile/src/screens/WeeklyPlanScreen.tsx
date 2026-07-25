import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCurrentPlan } from "../api/hooks";
import { SessionCard } from "../components/SessionCard";
import type { RootStackParamList } from "../navigation/types";
import { DAY_LABELS_ES, colors, radius, spacing, typography } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "WeeklyPlan">;

export function WeeklyPlanScreen({ navigation }: Props) {
  const plan = useCurrentPlan();

  if (plan.loading && !plan.data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (plan.error) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{plan.error}</Text>
      </View>
    );
  }

  if (!plan.data) return null;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.container}>
      <Text style={typography.title}>Semana {plan.data.mesocycleWeek} de 4</Text>
      {plan.data.isDeloadWeek && <Text style={styles.deloadTag}>Semana de descarga</Text>}
      <Text style={[typography.caption, styles.summary]}>{plan.data.summary}</Text>

      {plan.data.days.map((day) => (
        <View key={day.date} style={styles.dayBlock}>
          <View style={styles.dayHeader}>
            <Text style={typography.subtitle}>{DAY_LABELS_ES[day.dayOfWeek]}</Text>
            <Text style={typography.caption}>{day.date}</Text>
          </View>
          <View style={styles.sessionsCol}>
            {day.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                completed={day.completed}
                onPress={() =>
                  navigation.navigate("SessionDetail", { sessionId: session.id, date: day.date })
                }
              />
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2, gap: spacing.sm },
  error: { color: colors.danger },
  deloadTag: {
    alignSelf: "flex-start",
    color: colors.warning,
    fontWeight: "700",
    backgroundColor: "#3A2E12",
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: spacing.xs,
  },
  summary: { marginBottom: spacing.md },
  dayBlock: { marginTop: spacing.md, gap: spacing.sm },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  sessionsCol: { gap: spacing.sm },
});

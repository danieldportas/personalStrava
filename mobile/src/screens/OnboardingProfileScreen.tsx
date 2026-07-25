import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { api, ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { ChipGroup, FieldLabel, Stepper } from "../components/FormControls";
import { colors, radius, spacing, typography } from "../theme";
import type { ExperienceLevel, GoalType, Profile } from "../types";

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "general_fitness", label: "Forma fisica general" },
  { value: "5k", label: "5K" },
  { value: "10k", label: "10K" },
  { value: "half_marathon", label: "Media maraton" },
  { value: "marathon", label: "Maraton" },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string }[] = [
  { value: "beginner", label: "Principiante" },
  { value: "intermediate", label: "Intermedio" },
  { value: "advanced", label: "Avanzado" },
];

interface Props {
  existingProfile: Profile | null;
  onSaved: () => void;
}

export function OnboardingProfileScreen({ existingProfile, onSaved }: Props) {
  const { sessionToken } = useAuth();
  const [goalType, setGoalType] = useState<GoalType>(existingProfile?.goalType ?? "general_fitness");
  const [raceDate, setRaceDate] = useState(existingProfile?.raceDate ?? "");
  const [runDaysPerWeek, setRunDaysPerWeek] = useState(existingProfile?.runDaysPerWeek ?? 3);
  const [gymDaysPerWeek, setGymDaysPerWeek] = useState(existingProfile?.gymDaysPerWeek ?? 2);
  const [gymAccess, setGymAccess] = useState(existingProfile?.gymAccess ?? true);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>(
    existingProfile?.experienceLevel ?? "intermediate",
  );
  const [maxHeartRate, setMaxHeartRate] = useState(
    existingProfile?.maxHeartRate != null ? String(existingProfile.maxHeartRate) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showRaceDate = goalType !== "general_fitness";

  const handleSave = async () => {
    if (!sessionToken) return;
    if (showRaceDate && raceDate && !/^\d{4}-\d{2}-\d{2}$/.test(raceDate)) {
      setError("La fecha de la carrera debe tener el formato AAAA-MM-DD.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.saveProfile(sessionToken, {
        goalType,
        raceDate: showRaceDate && raceDate ? raceDate : null,
        runDaysPerWeek,
        gymDaysPerWeek,
        gymAccess,
        experienceLevel,
        maxHeartRate: maxHeartRate ? Number(maxHeartRate) : null,
        programStartDate: existingProfile?.programStartDate ?? new Date().toISOString().slice(0, 10),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={typography.title}>Tu plan de entrenamiento</Text>
        <Text style={[typography.body, styles.intro]}>
          Cuentanos tu objetivo y disponibilidad. Generaremos un plan semanal de running y gimnasio adaptado
          a tu carga de entrenamiento real en Strava.
        </Text>

        <FieldLabel>OBJETIVO</FieldLabel>
        <ChipGroup options={GOAL_OPTIONS} value={goalType} onChange={setGoalType} />

        {showRaceDate && (
          <>
            <FieldLabel>FECHA DE LA CARRERA (OPCIONAL, AAAA-MM-DD)</FieldLabel>
            <TextInput
              style={styles.input}
              placeholder="2026-10-18"
              placeholderTextColor={colors.textMuted}
              value={raceDate}
              onChangeText={setRaceDate}
              autoCapitalize="none"
            />
          </>
        )}

        <FieldLabel>DIAS DE CARRERA POR SEMANA</FieldLabel>
        <Stepper value={runDaysPerWeek} onChange={setRunDaysPerWeek} min={2} max={6} suffix="dias" />

        <FieldLabel>DIAS DE GIMNASIO POR SEMANA</FieldLabel>
        <Stepper value={gymDaysPerWeek} onChange={setGymDaysPerWeek} min={0} max={4} suffix="dias" />

        <View style={styles.switchRow}>
          <View style={styles.flex1}>
            <Text style={typography.subtitle}>Tengo acceso a gimnasio</Text>
            <Text style={[typography.caption]}>Si lo desactivas, usaremos solo ejercicios de peso corporal.</Text>
          </View>
          <Switch
            value={gymAccess}
            onValueChange={setGymAccess}
            trackColor={{ true: colors.primary, false: colors.border }}
          />
        </View>

        <FieldLabel>NIVEL DE EXPERIENCIA</FieldLabel>
        <ChipGroup options={EXPERIENCE_OPTIONS} value={experienceLevel} onChange={setExperienceLevel} />

        <FieldLabel>FRECUENCIA CARDIACA MAXIMA (OPCIONAL)</FieldLabel>
        <TextInput
          style={styles.input}
          placeholder="Ej. 190"
          placeholderTextColor={colors.textMuted}
          value={maxHeartRate}
          onChangeText={setMaxHeartRate}
          keyboardType="number-pad"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={colors.text} /> : <Text style={styles.buttonText}>Guardar y continuar</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  flex1: { flex: 1 },
  container: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  intro: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.md },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  error: { color: colors.danger, marginTop: spacing.md },
});

import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { api, ApiError } from "../api/client";
import { useProfile } from "../api/hooks";
import { OnboardingProfileScreen } from "./OnboardingProfileScreen";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing } from "../theme";

export function SettingsScreen() {
  const { sessionToken, signOut } = useAuth();
  const profile = useProfile();
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!sessionToken) return;
    setRegenerating(true);
    try {
      await api.regeneratePlan(sessionToken);
      Alert.alert("Listo", "Tu plan de esta semana se ha vuelto a generar con los datos mas recientes.");
    } catch (err) {
      Alert.alert("Error", err instanceof ApiError ? err.message : "No se pudo regenerar el plan.");
    } finally {
      setRegenerating(false);
    }
  };

  if (profile.loading && !profile.data) {
    return <ActivityIndicator color={colors.primary} style={styles.center} />;
  }

  return (
    <ScrollView style={styles.flex}>
      <OnboardingProfileScreen existingProfile={profile.data} onSaved={profile.refetch} />

      <Pressable style={styles.secondaryButton} onPress={handleRegenerate} disabled={regenerating}>
        {regenerating ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text style={styles.secondaryButtonText}>Regenerar plan de esta semana</Text>
        )}
      </Pressable>

      <Pressable style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Cerrar sesion</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, backgroundColor: colors.background },
  secondaryButton: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  secondaryButtonText: { color: colors.primary, fontWeight: "700" },
  signOutButton: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  signOutText: { color: colors.danger, fontWeight: "600" },
});

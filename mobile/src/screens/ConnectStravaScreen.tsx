import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, radius, spacing, typography } from "../theme";

WebBrowser.maybeCompleteAuthSession();

export function ConnectStravaScreen() {
  const { signIn } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const redirectUrl = Linking.createURL("auth-success");
      const result = await WebBrowser.openAuthSessionAsync(api.authorizeUrl(), redirectUrl);

      if (result.type !== "success" || !result.url) {
        setError("Conexion cancelada. Puedes intentarlo de nuevo cuando quieras.");
        return;
      }

      const { queryParams, hostname, path } = Linking.parse(result.url);
      const isErrorCallback = hostname === "auth-error" || path === "auth-error";
      if (isErrorCallback) {
        setError(String(queryParams?.reason ?? "Strava rechazo la conexion."));
        return;
      }

      const token = queryParams?.token;
      if (typeof token !== "string") {
        setError("No se recibio un token de sesion valido.");
        return;
      }
      await signIn(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido conectando con Strava.");
    } finally {
      setConnecting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.emoji}>🏃</Text>
        <Text style={typography.title}>PersonalStrava</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Tu planificacion de running y gimnasio, generada a partir de tus datos reales de Strava.
        </Text>
      </View>

      <View style={styles.features}>
        <FeatureRow icon="📈" text="Carga de entrenamiento y ritmo umbral calculados a partir de tu historial" />
        <FeatureRow icon="🗓️" text="Plan semanal periodizado: rodajes, series, tirada larga y gimnasio" />
        <FeatureRow icon="🛡️" text="Progresion segura basada en tu ratio de carga aguda:cronica (ACWR)" />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.button} onPress={handleConnect} disabled={connecting}>
        {connecting ? (
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.buttonText}>Conectar con Strava</Text>
        )}
      </Pressable>
      <Text style={styles.disclaimer}>
        Se abrira la pagina oficial de autorizacion de Strava. Solo pedimos acceso de lectura a tu perfil y
        actividades.
      </Text>
    </View>
  );
}

function FeatureRow({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <Text style={[typography.body, styles.featureText]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    justifyContent: "center",
  },
  hero: { alignItems: "center", marginBottom: spacing.xl },
  emoji: { fontSize: 56, marginBottom: spacing.sm },
  subtitle: { textAlign: "center", marginTop: spacing.sm, color: colors.textMuted },
  features: { marginBottom: spacing.xl, gap: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  featureIcon: { fontSize: 20 },
  featureText: { flex: 1, color: colors.textMuted },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: "700" },
  error: { color: colors.danger, textAlign: "center", marginBottom: spacing.md },
  disclaimer: { color: colors.textMuted, fontSize: 12, textAlign: "center", marginTop: spacing.md },
});

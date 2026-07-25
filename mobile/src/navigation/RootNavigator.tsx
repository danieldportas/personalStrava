import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useProfile } from "../api/hooks";
import { useAuth } from "../context/AuthContext";
import { ConnectStravaScreen } from "../screens/ConnectStravaScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { OnboardingProfileScreen } from "../screens/OnboardingProfileScreen";
import { SessionDetailScreen } from "../screens/SessionDetailScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WeeklyPlanScreen } from "../screens/WeeklyPlanScreen";
import { colors } from "../theme";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
  fonts: {
    regular: { fontFamily: "System", fontWeight: "400" as const },
    medium: { fontFamily: "System", fontWeight: "500" as const },
    bold: { fontFamily: "System", fontWeight: "700" as const },
    heavy: { fontFamily: "System", fontWeight: "800" as const },
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export function RootNavigator() {
  const { sessionToken, isLoading: authLoading } = useAuth();
  const profile = useProfile();

  if (authLoading || (sessionToken && profile.loading && !profile.data && !profile.notFound)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={screenOptions}>
        {!sessionToken ? (
          <Stack.Screen name="ConnectStrava" component={ConnectStravaScreen} options={{ headerShown: false }} />
        ) : profile.notFound || !profile.data ? (
          <Stack.Screen name="Onboarding" options={{ title: "Configura tu plan" }}>
            {() => <OnboardingProfileScreen existingProfile={null} onSaved={profile.refetch} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: "PersonalStrava" }} />
            <Stack.Screen name="WeeklyPlan" component={WeeklyPlanScreen} options={{ title: "Plan semanal" }} />
            <Stack.Screen
              name="SessionDetail"
              component={SessionDetailScreen}
              options={{ title: "Detalle de sesion" }}
            />
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: "Ajustes" }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

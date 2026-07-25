import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SESSION_TOKEN_KEY = "personalstrava.sessionToken";

interface AuthContextValue {
  sessionToken: string | null;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(SESSION_TOKEN_KEY)
      .then((stored) => setSessionToken(stored))
      .finally(() => setIsLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessionToken,
      isLoading,
      signIn: async (token: string) => {
        await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token);
        setSessionToken(token);
      },
      signOut: async () => {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
        setSessionToken(null);
      },
    }),
    [sessionToken, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
}

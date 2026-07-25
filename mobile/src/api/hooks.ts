import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { Metrics, Profile, WeeklyPlan } from "../types";
import { api, ApiError } from "./client";

export function useProfile() {
  const { sessionToken } = useAuth();
  const [data, setData] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const refetch = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      const profile = await api.getProfile(sessionToken);
      setData(profile);
      setNotFound(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setData(null);
        setNotFound(true);
      } else {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, notFound, refetch };
}

export function useMetrics() {
  const { sessionToken } = useAuth();
  const [data, setData] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getMetrics(sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useCurrentPlan() {
  const { sessionToken } = useAuth();
  const [data, setData] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!sessionToken) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.getCurrentPlan(sessionToken));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

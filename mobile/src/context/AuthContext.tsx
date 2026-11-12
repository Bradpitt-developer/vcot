import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { data } from "../services/data";
import { setSessionToken } from "../services/session";
import type { Department, SessionUser } from "../types";

const TOKEN_KEY = "@silai-saathi/session-token";

type AuthContextValue = {
  ready: boolean;
  user: SessionUser | null;
  signInAdmin: (username: string, password: string) => Promise<void>;
  signInManager: (
    department: Department,
    username: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  const applySession = useCallback(
    async (token: string, sessionUser: SessionUser) => {
      setSessionToken(token);
      setUser(sessionUser);
      try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
      } catch (error) {
        console.warn("Session could not be remembered on this device.", error);
      }
    },
    []
  );

  const clearSession = useCallback(async () => {
    setSessionToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn("Session could not be cleared from this device.", error);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const token = await AsyncStorage.getItem(TOKEN_KEY);
        if (!token) return;

        setSessionToken(token);
        const sessionUser = await data.me();
        if (mounted) setUser(sessionUser);
      } catch {
        setSessionToken(null);
        await AsyncStorage.removeItem(TOKEN_KEY).catch(() => {});
      } finally {
        if (mounted) setReady(true);
      }
    }

    void restoreSession();
    return () => {
      mounted = false;
    };
  }, []);

  const signInAdmin = useCallback(
    async (username: string, password: string) => {
      const result = await data.loginAdmin(username, password);
      await applySession(result.token, result.user);
    },
    [applySession]
  );

  const signInManager = useCallback(
    async (department: Department, username: string, password: string) => {
      const result = await data.loginManager(department, username, password);
      await applySession(result.token, result.user);
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ ready, user, signInAdmin, signInManager, signOut }),
    [ready, user, signInAdmin, signInManager, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

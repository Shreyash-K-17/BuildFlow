"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  AuthResponseData,
  LoginPayload,
  MeResponseData,
  RegisterPayload,
  User,
} from "@/types";
import { api, clearAuthToken, getAuthToken, setAuthToken } from "./api";

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    clearAuthToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const savedToken = getAuthToken();
    if (!savedToken) {
      setUser(null);
      setTokenState(null);
      return null;
    }

    try {
      const data = await api.get<MeResponseData>("/auth/me", {
        token: savedToken,
      });
      setUser(data.user);
      setTokenState(savedToken);
      return data.user;
    } catch {
      // Invalid or expired token: clear session
      logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const savedToken = getAuthToken();
      if (!savedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const data = await api.get<MeResponseData>("/auth/me", {
          token: savedToken,
        });
        if (isMounted) {
          setUser(data.user);
          setTokenState(savedToken);
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = async (credentials: LoginPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post<AuthResponseData>("/auth/login", credentials);
      setAuthToken(data.access_token);
      setTokenState(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    setIsLoading(true);
    try {
      const data = await api.post<AuthResponseData>(
        "/auth/register",
        payload
      );
      setAuthToken(data.access_token);
      setTokenState(data.access_token);
      setUser(data.user);
      return data.user;
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!user && !!token,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

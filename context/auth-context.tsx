"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { getSession } from "next-auth/react";

export interface User {
  userId: string;
  email: string;
  role: "user" | "restaurant" | "admin";
  firstName: string;
  lastName: string;
  restaurantId: string | null;
  subscriptionStatus: "active" | "cancelled" | "inactive" | "cancelled_with_access";
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  authLoading: boolean;
  authError: string | null;
  checkAuth: () => Promise<void>;
  setAuthState: (user: User | null, isAuthenticated: boolean) => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  authLoading: true,
  authError: null,
  checkAuth: async () => { },
  setAuthState: () => { },
  clearAuthError: () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const checkAuth = async () => {
    setAuthLoading(true);
    setAuthError(null);
    const timeoutId = setTimeout(() => {
      setAuthLoading(false);
      setUser(null);
      setIsAuthenticated(false);
    }, 10000);

    try {
      const session = await getSession();
      if (session && session.user) {
        clearTimeout(timeoutId);
        const sessionUser: User = {
          userId: (session.user as any).userId || "",
          email: session.user.email || "",
          role: (session.user as any).role || "user",
          firstName: (session.user as any).firstName || session.user.name?.split(" ")[0] || "",
          lastName: (session.user as any).lastName || session.user.name?.split(" ")[1] || "",
          restaurantId: (session.user as any).restaurantId || null,
          subscriptionStatus: (session.user as any).subscriptionStatus || "inactive",
        };
        setUser(sessionUser);
        setIsAuthenticated(true);
        setAuthLoading(false);
        return;
      }

      // NOTE: If app crashes/hangs due to verify-token API, remove this call and the redirect logic from MarketingLayout
      const res = await fetch("/api/auth/verify-token", { method: "POST", credentials: "include" });
      let data: { success?: boolean; user?: User; error?: string } = {};
      try {
        const text = await res.text();
        if (text) data = JSON.parse(text) as typeof data;
      } catch {
        clearTimeout(timeoutId);
        setAuthError("Unable to verify your session. Please try again.");
        setUser(null);
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      if (res.ok && data.user) {
        const userData: User = {
          userId: data.user.userId,
          email: data.user.email,
          role: data.user.role,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          restaurantId: data.user.restaurantId,
          subscriptionStatus: data.user.subscriptionStatus,
        };
        setUser(userData);
        // const isUserAuthenticated =
        //   data.user.role === "user" && data.user.subscriptionStatus !== "inactive";
        // const isRestaurantAuthenticated = data.user.role === "restaurant";
        // const isAdminAuthenticated = data.user.role === "admin";
        // setIsAuthenticated(isUserAuthenticated || isRestaurantAuthenticated || isAdminAuthenticated);
        const isValidUser = !!data.user.userId && !!data.user.email;
        const isRestaurantAuthenticated = data.user.role === "restaurant";
        const isAdminAuthenticated = data.user.role === "admin";

        setIsAuthenticated(isValidUser || isRestaurantAuthenticated || isAdminAuthenticated);
        setAuthError(null);
      } else {
        setUser(null);
        setIsAuthenticated(false);
        const errMsg = data.error || "";
        const shouldHideError = /missing|no token|user not found/i.test(errMsg);
        if (!shouldHideError) {
          setAuthError(errMsg || "Your session has expired. Please sign in again.");
        }
      }
    } catch (err) {
      console.error("Auth check failed", err);
      setUser(null);
      setIsAuthenticated(false);
      setAuthError("Connection error. Please check your network and try again.");
    } finally {
      clearTimeout(timeoutId);
      setAuthLoading(false);
    }
  };

  const setAuthState = (user: User | null, authenticated: boolean) => {
    setUser(user);
    setIsAuthenticated(authenticated);
  };

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, authLoading, authError, checkAuth, setAuthState, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
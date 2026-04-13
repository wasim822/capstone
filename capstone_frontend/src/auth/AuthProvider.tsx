"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/types/roles";
import { clearSession } from "@/auth/session";
import { usersApi } from "@/services/api/users/users.api";

/** Backend role name – used to enforce "only SuperAdmin can manage Admin users" */
export type BackendRoleName = "SuperAdmin" | "Admin" | "Manager" | "Staff";

/**
 * Frontend User model
 * Represents the authenticated user stored in React context
 */
type User = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role: UserRole;
  /** Backend role name from JWT – use for rules like "Admin cannot edit other Admins" */
  backendRoleName: BackendRoleName;
};
/**
 * Authentication context interface
 * This defines what values/components can access using useAuth()
 */
type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  updateUser: (nextUser: Partial<User>) => void;
  /** Current user role (convenience so components can use const { role } = useAuth()) */
  role: UserRole | undefined;
  /** Backend role name – e.g. "SuperAdmin" vs "Admin" for permission rules */
  backendRoleName: BackendRoleName | undefined;
};


const AuthContext = createContext<AuthContextType | null>(null);

/**
 * AuthProvider wraps the entire application
 * and provides authentication state everywhere
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const TOKEN_KEY = "wms_token";

  const toFrontendRole = useCallback((rawRole: string): UserRole => {
    if (rawRole === "superadmin" || rawRole === "admin") return "admin";
    if (rawRole === "manager") return "manager";
    return "staff";
  }, []);

  const toBackendRoleName = useCallback((rawRole: string): BackendRoleName => {
    return rawRole === "superadmin"
      ? "SuperAdmin"
      : rawRole === "admin"
        ? "Admin"
        : rawRole === "manager"
          ? "Manager"
          : "Staff";
  }, []);

  const enrichUser = useCallback(async (baseUser: User): Promise<User> => {
    try {
      const currentUser = await usersApi.getCurrent();
      const rawRole = (
        currentUser.Role?.RoleName ??
        baseUser.backendRoleName ??
        "staff"
      )
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "");

      const firstName = currentUser.FirstName?.trim() ?? "";
      const lastName = currentUser.LastName?.trim() ?? "";

      return {
        ...baseUser,
        id: currentUser.Id || baseUser.id,
        firstName,
        lastName,
        email: currentUser.Email ?? baseUser.email,
        role: toFrontendRole(rawRole),
        backendRoleName: toBackendRoleName(rawRole),
        name:
          [firstName, lastName].filter(Boolean).join(" ") ||
          baseUser.name ||
          currentUser.Username ||
          "User",
      };
    } catch {
      return baseUser;
    }
  }, [toBackendRoleName, toFrontendRole]);

  /**
   * Decode JWT token payload
   * JWT format = header.payload.signature
   * We decode the payload to extract user information
   */
  const decodeToken = useCallback((token: string): User | null => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      // Support both camelCase and PascalCase from backend (e.g. RoleName, UserName)
      const rawName =
        payload.username ?? payload.userName ?? payload.Username ?? "";
      const rawRole = (
        payload.roleName ??
        payload.role ??
        payload.RoleName ??
        "staff"
      )
        .toString()
        .toLowerCase()
        .replace(/\s+/g, "");

      const firstName = String(
        payload.firstName ?? payload.FirstName ?? "",
      ).trim();
      const lastName = String(
        payload.lastName ?? payload.LastName ?? "",
      ).trim();
      const email = String(payload.email ?? payload.Email ?? "").trim();

      return {
        id: payload.userId ?? payload.sub ?? payload.UserId ?? "",
        name:
          [firstName, lastName].filter(Boolean).join(" ") ||
          String(rawName).trim() ||
          "User",
        firstName,
        lastName,
        email,
        role: toFrontendRole(rawRole),
        backendRoleName: toBackendRoleName(rawRole),
      };
    } catch (err) {
      console.error("Invalid JWT token", err);
      return null;
    }
  }, [toBackendRoleName, toFrontendRole]);

  /**
   * Login function
   * Called after backend returns JWT
   */
  async function login(token: string) {

    // Save token in localStorage
    localStorage.setItem(TOKEN_KEY, token);

    // Decode JWT
    const decodedUser = decodeToken(token);

    if (!decodedUser) {
      throw new Error("Invalid token received");
    }

    // Store user in context
    setUser(decodedUser);
    setUser(await enrichUser(decodedUser));

    // Authentication finished
    setLoading(false);
  }

  /**
   * Logout: clear all auth state (token + cookie) and redirect to login
   */
  function logout() {
    clearSession();
    setUser(null);
    router.push("/login");
  }

  function updateUser(nextUser: Partial<User>) {
    setUser((currentUser) =>
      currentUser
        ? {
            ...currentUser,
            ...nextUser,
          }
        : currentUser,
    );
  }

  /**
   * When the application loads
   * check if a token already exists
   */
  useEffect(() => {
    let cancelled = false;

    async function initializeAuth() {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      const decodedUser = decodeToken(token);

      if (!decodedUser) {
        localStorage.removeItem(TOKEN_KEY);
        if (!cancelled) setLoading(false);
        return;
      }

      if (!cancelled) {
        setUser(decodedUser);
      }

      const nextUser = await enrichUser(decodedUser);

      if (!cancelled) {
        setUser(nextUser);
        setLoading(false);
      }
    }

    void initializeAuth();

    return () => {
      cancelled = true;
    };
  }, [decodeToken, enrichUser]);

  /**
   * Provide auth values to the whole app
   */
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        role: user?.role,
        backendRoleName: user?.backendRoleName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook used in components to access authentication
 *
 * Example:
 * const { user, logout } = useAuth();
 */
export function useAuth() {

  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be inside AuthProvider");
  }

  return ctx;
}

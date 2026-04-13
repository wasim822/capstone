"use client";

/**
 * AuthGuard: Protects dashboard (and any wrapped) routes so only authenticated
 * users can see them. If the user is not logged in (no auth context user),
 * redirects to /login. Shows a loading state while auth is being resolved.
 * Used by the dashboard layout so all dashboard pages require login.
 */
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/auth/AuthProvider";

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
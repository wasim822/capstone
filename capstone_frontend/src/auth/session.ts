/**
 * Single place to clear all client-side auth state.
 * Use on logout and on 401 (session expired) so token and cookie stay in sync.
 */
import { clearToken } from "./token";
import { clearAuthCookie } from "@/lib/authCookies";

export function clearSession(): void {
  clearToken();
  clearAuthCookie();
}

/**
 * Cookie helper for authentication
 * Stores and removes the JWT token used by middleware
 */

export const COOKIE_NAME = "session-token";

/**
 * Save token to browser cookie
 * Middleware will read this cookie to allow protected routes
 */
export function setAuthCookie(token: string) {
  document.cookie = `${COOKIE_NAME}=${token}; path=/; SameSite=Lax`;
}

/**
 * Remove authentication cookie (logout)
 */
export function clearAuthCookie() {
  document.cookie = `${COOKIE_NAME}=; Max-Age=0; path=/`;
}
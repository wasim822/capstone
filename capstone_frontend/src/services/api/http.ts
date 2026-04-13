import type { ApiResponse } from "./types";
import { getToken } from "@/auth/token";
import { clearSession } from "@/auth/session";

//all requests automatically go to backend server ....
const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasApiShape<T>(value: unknown): value is ApiResponse<T> {
  if (!isRecord(value)) return false;
  return "Success" in value && "Data" in value;
}

async function parseJsonSafe(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  //reads token from localstorage .... 
  const token = getToken();
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const defaultHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  if (!isFormDataBody) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  //if token exists, u automatically attach .. you never manually attach token again..
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });
  
  // Session expired or invalid: clear all auth state and send to login
  if (res.status === 401) {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Session expired");
  }

  //prevents crashes if backend sends empty response.. 
  const body = await parseJsonSafe(res);

  //All API errors handled in one place ..
  if (!res.ok) {
    if (hasApiShape<unknown>(body)) {
      throw new Error(
        (body.Message as string) || `Request failed (${res.status})`,
      );
    }
    throw new Error(
      typeof body === "string" ? body : `Request failed (${res.status})`,
    );
  }

  // ensures backend format .. 
  if (!hasApiShape<T>(body)) {
    throw new Error("Unexpected server response shape");
  }

  if (body.Success === false) {
    throw new Error(body.Message || "Request failed");
  }

  return body;
}

export const http = {
  async data<T>(path: string, options?: RequestInit): Promise<T> {
    const result = await request<T>(path, options);
    return result.Data; //returns onl data ..
  },

  //returns full API response ..
  async raw<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
    return request<T>(path, options);
  },
};

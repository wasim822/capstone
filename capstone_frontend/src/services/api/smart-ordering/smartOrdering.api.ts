import { getToken } from "@/auth/token";
import { http } from "@/services/api/http";
import type { SmartOrderingRow } from "./smartOrdering.types";

/**
 * Mock dataset — matches PM reference layout; replace when API returns real rows.
 * Set NEXT_PUBLIC_SMART_ORDERING_MOCK=false and implement live path once backend is ready.
 */
const MOCK_RECOMMENDATIONS: SmartOrderingRow[] = [
  {
    id: "1",
    name: "Premium Arabica Coffee Beans",
    sku: "CF-2048-A",
    category: "Beverages",
    currentStock: 82,
    maxCapacity: 300,
    recommendedQty: 150,
    recommendationNote: "Seasonal demand spike; current stock won’t last the window",
    reasoning:
      "Velocity increasing by 40% due to seasonal demand spike across retail channels.",
    stockoutRisk: "high",
    confidencePercent: 94,
    confidenceLabel: "seasonality match",
  },
  {
    id: "2",
    name: "Eco Dish Soap Refill",
    sku: "HS-1182-E",
    category: "Household",
    currentStock: 140,
    maxCapacity: 260,
    recommendedQty: 90,
    recommendationNote: "Suggested reorder based on forecasted depletion",
    reasoning:
      "Vendor delay predicted based on historical lead-time variance and current purchase cadence.",
    stockoutRisk: "medium",
    confidencePercent: 88,
    confidenceLabel: "trend-based",
  },
  {
    id: "3",
    name: "Industrial Nitrile Gloves (M)",
    sku: "SG-9921-M",
    category: "Safety",
    currentStock: 210,
    maxCapacity: 400,
    recommendedQty: 40,
    recommendationNote: "Stable demand with slight uptick from new workstations",
    reasoning:
      "Stable usage with slight upward trend from new workstation onboarding next month.",
    stockoutRisk: "low",
    confidencePercent: 76,
    confidenceLabel: "baseline forecast",
  },
  {
    id: "4",
    name: "12V Cordless Drill Kit",
    sku: "TL-4400-D",
    category: "Tools",
    currentStock: 18,
    maxCapacity: 120,
    recommendedQty: 60,
    recommendationNote: "Promo-driven velocity; below safety level within ~12 days",
    reasoning:
      "Promotional bundle driving attach rate; stock projected below safety level in 12 days.",
    stockoutRisk: "high",
    confidencePercent: 91,
    confidenceLabel: "promo uplift",
  },
];

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Fetches AI reorder rows.
 *
 * - Default / `NEXT_PUBLIC_SMART_ORDERING_MOCK` unset or not `"false"`: mock data.
 * - `NEXT_PUBLIC_SMART_ORDERING_MOCK=false`: Next.js Route Handler `POST /api/smart-ordering/generate`
 *   (GitHub Models + `Agent.md`). Requires `GITHUB_TOKEN` in `.env.local` (server only).
 *   When the user is logged in, sends `Authorization: Bearer` so the route can load live inventory
 *   from Express `GET /api/inventory/list` and ground the model on real DB rows.
 *   `demandWindowDays` filters order history by parent order date (passed in JSON body).
 * - Optional: `NEXT_PUBLIC_SMART_ORDERING_SOURCE=express` + mock false → capstone Express
 *   `GET` `/api/smart-ordering/recommendations` (when backend implements it).
 */
export type GetSmartOrderingOptions = {
  /** Aborts the request to `/api/smart-ordering/generate` (e.g. timeout or user navigates away). */
  signal?: AbortSignal;
};

export async function getSmartOrderingRecommendations(
  demandWindowDays: number = 30,
  options: GetSmartOrderingOptions = {},
): Promise<SmartOrderingRow[]> {
  const useMock =
    typeof process.env.NEXT_PUBLIC_SMART_ORDERING_MOCK === "undefined" ||
    process.env.NEXT_PUBLIC_SMART_ORDERING_MOCK !== "false";

  if (useMock) {
    await delay(350);
    return MOCK_RECOMMENDATIONS;
  }

  const source = process.env.NEXT_PUBLIC_SMART_ORDERING_SOURCE ?? "next";

  if (source === "express") {
    try {
      const res = await http.raw<SmartOrderingRow[]>(
        "/api/smart-ordering/recommendations",
      );
      if (res.Success && Array.isArray(res.Data)) {
        return res.Data;
      }
      throw new Error(res.Message || "Failed to load recommendations");
    } catch (e) {
      console.warn(
        "[smart-ordering] Express API failed; set NEXT_PUBLIC_SMART_ORDERING_MOCK=true or fix backend.",
        e,
      );
      throw e;
    }
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const jwt = getToken();
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  const days =
    Number.isFinite(demandWindowDays) && demandWindowDays > 0
      ? Math.min(365, Math.max(1, Math.round(demandWindowDays)))
      : 30;

  const res = await fetch("/api/smart-ordering/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({ demandWindowDays: days }),
    signal: options.signal,
  });

  const rawText = await res.text();
  let data: { rows?: SmartOrderingRow[]; error?: string } = {};
  try {
    data = rawText ? (JSON.parse(rawText) as typeof data) : {};
  } catch {
    const hint =
      /too many requests/i.test(rawText) || res.status === 429
        ? "GitHub Models rate limit — wait a few minutes and try again."
        : rawText.slice(0, 180).trim() || `Invalid response (${res.status})`;
    throw new Error(hint);
  }

  if (!res.ok) {
    throw new Error(
      data?.error ||
        (res.status === 429
          ? "GitHub Models rate limit — wait and retry."
          : `AI route failed (${res.status})`),
    );
  }
  if (!Array.isArray(data.rows)) {
    throw new Error("Invalid response: missing rows array");
  }
  return data.rows;
}

/** For tests or Storybook */
export function getMockSmartOrderingRecommendations(): SmartOrderingRow[] {
  return [...MOCK_RECOMMENDATIONS];
}

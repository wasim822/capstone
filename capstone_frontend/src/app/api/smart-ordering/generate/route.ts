import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  loadSmartOrderingContext,
  type InventoryMergeRow,
} from "@/lib/smartOrdering/loadSmartOrderingContext";
import {
  extractJsonObject,
  mapAiItemToRow,
  type AiRecommendationItem,
} from "@/lib/smartOrdering/mapAiRecommendations";
import { mergeSmartOrderingRowsWithInventory } from "@/lib/smartOrdering/mergeSmartOrderingWithInventory";
import type { SmartOrderingRow } from "@/services/api/smart-ordering/smartOrdering.types";

export const maxDuration = 300;

const endpoint = "https://models.github.ai/inference";
const model = "openai/gpt-4.1";

type BackendDataEnvelope<T> = {
  Success?: boolean;
  Message?: string | null;
  Data?: T;
};

type PersistAiGraphRow = {
  Ai_Id: string;
  Item: string;
  Sku: string;
  Category: string;
  CurrentStock: number;
  MaxCapacity: number;
  AiRecommendedQty: number;
  RecommendationNote: string;
  ForecastWindowDays: number;
  AiReasoning: string;
  StockoutRisk: string;
  ConfidenceScore: number;
  ConfidenceLabel: string;
  ImageUrl?: string;
};

function apiBase(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:4000"
  );
}

function clampDemandWindowDays(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(365, Math.max(1, Math.round(n)));
}

export async function POST(request: Request) {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    if (!githubToken) {
      return NextResponse.json(
        { error: "Missing GITHUB_TOKEN environment variable." },
        { status: 500 },
      );
    }

    let body: { inputData?: string; demandWindowDays?: unknown } = {};
    try {
      const raw = await request.text();
      if (raw.trim()) {
        body = JSON.parse(raw) as typeof body;
      }
    } catch {
      body = {};
    }

    const demandWindowDays = clampDemandWindowDays(body.demandWindowDays);

    let extraInput = "";
    let hasLiveInventory = false;
    let hasOrderHistory = false;
    let mergeBySkuKey: Map<string, InventoryMergeRow> | null = null;
    const authHeader = request.headers.get("authorization");

    if (typeof body.inputData === "string" && body.inputData.trim()) {
      extraInput = `\n\n## INPUT DATA\n${body.inputData.trim()}\n`;
      hasLiveInventory = true;
    } else if (authHeader?.trim()) {
      const ctx = await loadSmartOrderingContext(authHeader, { demandWindowDays });
      if (!ctx.ok) {
        return NextResponse.json({ error: ctx.message }, { status: ctx.status });
      }
      extraInput = `\n\n## INPUT DATA\n${ctx.promptText}\n`;
      hasLiveInventory = true;
      hasOrderHistory = ctx.hasOrdersSection;
      mergeBySkuKey = ctx.mergeBySkuKey;
    }

    const agentPath = path.join(process.cwd(), "src", "prompts", "Agent.md");
    const agentMarkdown = await readFile(agentPath, "utf-8");
    const windowHint = hasLiveInventory
      ? ` Order history in INPUT DATA is limited to approximately the last ${demandWindowDays} days by order date (see demand_window_days).`
      : "";
    const invSkuCount =
      mergeBySkuKey && mergeBySkuKey.size > 0 ? mergeBySkuKey.size : 0;
    const stableRowRule =
      invSkuCount > 0 && invSkuCount <= 40
        ? ` CRITICAL: Live inventory has ${invSkuCount} SKUs. Output exactly ${invSkuCount} recommendation objects—one per listed SKU, same skus, do not omit or invent SKUs.`
        : invSkuCount > 40
          ? ` Inventory has many SKUs (${invSkuCount}); output at least 25 recommendations prioritizing lowest current_stock and highest recent demand.`
          : "";
    const tailInstruction = hasLiveInventory
      ? hasOrderHistory
        ? `Respond with ONLY valid JSON matching the OUTPUT RULES (no markdown fences, no commentary). Base recommendations on INPUT DATA: inventory list plus historical order lines and sku_demand_summary within the stated demand window.${windowHint} Use exact sku and item_name from inventory. Reference real demand patterns from the order data when explaining reasoning. Where max_capacity is missing, infer from current_stock, category, and demand.${stableRowRule}`
        : `Respond with ONLY valid JSON matching the OUTPUT RULES (no markdown fences, no commentary). Base every recommendation on the INPUT DATA inventory; order history may be empty for the selected window—say so briefly if relevant.${windowHint} Use exact sku and item_name from inventory. Where max_capacity is missing, infer reasonable values from current_stock and category.${stableRowRule}`
      : "Respond with ONLY valid JSON matching the OUTPUT RULES (no markdown fences, no commentary). Use realistic sample inventory if INPUT DATA is empty. Include at least 3 recommendations.";
    const userPrompt = `${agentMarkdown}${extraInput}\n\n${tailInstruction}`;

    const client = ModelClient(endpoint, new AzureKeyCredential(githubToken));

    let response;
    try {
      response = await client.path("/chat/completions").post({
        body: {
          messages: [
            {
              role: "system",
              content:
                "You are a data generator for a warehouse UI. Output only valid JSON as specified by the user. Never wrap in markdown code fences.",
            },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.2,
          top_p: 1.0,
          model,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const rateLimited =
        /too many requests|rate limit|429|unexpected token.*too many/i.test(
          msg,
        );
      if (rateLimited) {
        return NextResponse.json(
          {
            error:
              "GitHub Models rate limit: wait a few minutes, then try again. Avoid switching timeframe rapidly while testing.",
          },
          { status: 429 },
        );
      }
      return NextResponse.json(
        { error: msg || "Model request failed." },
        { status: 502 },
      );
    }

    if (isUnexpected(response)) {
      const errBody = response.body as { error?: { message?: string } };
      return NextResponse.json(
        { error: errBody?.error?.message || "Model request failed." },
        { status: 500 },
      );
    }

    const okBody = response.body as {
      choices?: { message?: { content?: string } }[];
    };
    const rawText =
      okBody.choices?.[0]?.message?.content || "No response text returned.";

    let parsed: unknown;
    try {
      parsed = extractJsonObject(rawText);
    } catch {
      return NextResponse.json(
        {
          error: "Model did not return valid JSON.",
          debugSnippet: rawText.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const recs = extractRecommendations(parsed);
    let rows: SmartOrderingRow[] = recs.map((item, i) =>
      mapAiItemToRow(item, i),
    );

    if (mergeBySkuKey && mergeBySkuKey.size > 0) {
      rows = mergeSmartOrderingRowsWithInventory(rows, mergeBySkuKey);
    }

    let savedCount = 0;
    if (authHeader?.trim() && rows.length > 0) {
      savedCount = await persistAiGraphRows(authHeader, rows, demandWindowDays);
    }

    return NextResponse.json({ rows, savedCount });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unexpected server error.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function persistAiGraphRows(
  authorizationHeader: string,
  rows: SmartOrderingRow[],
  forecastWindowDays: number,
): Promise<number> {
  const runId = `smart-order-${Date.now()}`;
  const payloadRows: PersistAiGraphRow[] = rows.map((row) => ({
    Ai_Id: runId,
    Item: row.name,
    Sku: row.sku,
    Category: row.category,
    CurrentStock: Number.isFinite(row.currentStock) ? row.currentStock : 0,
    MaxCapacity: Number.isFinite(row.maxCapacity) ? row.maxCapacity : 0,
    AiRecommendedQty: Number.isFinite(row.recommendedQty) ? row.recommendedQty : 0,
    RecommendationNote: row.recommendationNote || "",
    ForecastWindowDays: forecastWindowDays,
    AiReasoning: row.reasoning || "",
    StockoutRisk: row.stockoutRisk,
    ConfidenceScore: Number.isFinite(row.confidencePercent)
      ? Math.min(100, Math.max(0, row.confidencePercent))
      : 0,
    ConfidenceLabel: row.confidenceLabel || "",
    ImageUrl:
      typeof row.imageUrl === "string" && row.imageUrl.trim()
        ? row.imageUrl.trim()
        : undefined,
  }));

  const res = await fetch(`${apiBase()}/api/ai-graph/sync`, {
    method: "POST",
    headers: {
      Authorization: authorizationHeader.trim(),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ rows: payloadRows, ForecastWindowDays: forecastWindowDays }),
    cache: "no-store",
  });

  const raw = await res.text();
  let body: BackendDataEnvelope<{ savedCount?: number }> = {};
  try {
    body = raw ? (JSON.parse(raw) as BackendDataEnvelope<{ savedCount?: number }>) : {};
  } catch {
    throw new Error("AI predictions were generated, but saving to AI graph failed (invalid backend response).");
  }

  if (!res.ok || body.Success === false) {
    throw new Error(
      body.Message ||
        `AI predictions were generated, but saving to AI graph failed (${res.status}).`,
    );
  }

  return Number(body.Data?.savedCount ?? 0);
}

function extractRecommendations(parsed: unknown): AiRecommendationItem[] {
  if (!parsed || typeof parsed !== "object") return [];
  const o = parsed as Record<string, unknown>;
  if (Array.isArray(o.recommendations)) {
    return o.recommendations as AiRecommendationItem[];
  }
  if (Array.isArray(o.Recommendations)) {
    return o.Recommendations as AiRecommendationItem[];
  }
  if (Array.isArray(o.data)) {
    return o.data as AiRecommendationItem[];
  }
  return [];
}

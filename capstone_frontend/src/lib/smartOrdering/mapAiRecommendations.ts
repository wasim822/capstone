import type { SmartOrderingRow, StockoutRiskLevel } from "@/services/api/smart-ordering/smartOrdering.types";

/** Shape from Agent.md model output */
export interface AiRecommendationItem {
  sku?: string;
  item_name?: string;
  category?: string;
  current_stock_units?: number;
  max_capacity_units?: number;
  recommended_reorder_units?: number;
  stockout_risk?: string;
  confidence_score?: number;
  confidence_label?: string;
  /** Short UI line under recommended qty (see Agent.md) */
  recommendation_note?: string;
  reasoning?: string;
}

function normalizeRisk(risk: string | undefined): StockoutRiskLevel {
  const v = (risk ?? "medium").toLowerCase();
  if (v === "high") return "high";
  if (v === "low") return "low";
  return "medium";
}

const DEFAULT_RECOMMENDATION_NOTE = "Suggested reorder based on forecasted depletion";

export function mapAiItemToRow(item: AiRecommendationItem, index: number): SmartOrderingRow {
  const sku = String(item.sku ?? `sku-${index}`);
  const note = String(item.recommendation_note ?? "").trim();
  return {
    id: sku,
    name: String(item.item_name ?? sku),
    sku,
    category: String(item.category ?? "—"),
    currentStock: Number(item.current_stock_units ?? 0),
    maxCapacity: Math.max(1, Number(item.max_capacity_units ?? 100)),
    recommendedQty: Math.max(0, Number(item.recommended_reorder_units ?? 0)),
    recommendationNote: note || DEFAULT_RECOMMENDATION_NOTE,
    reasoning: String(item.reasoning ?? ""),
    stockoutRisk: normalizeRisk(item.stockout_risk),
    confidencePercent: Math.min(100, Math.max(0, Number(item.confidence_score ?? 0))),
    confidenceLabel: String(item.confidence_label ?? ""),
  };
}

/** Strip ```json fences if the model wrapped output */
export function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw) as unknown;
}

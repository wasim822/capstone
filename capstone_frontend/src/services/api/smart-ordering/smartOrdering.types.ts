/**
 * Smart ordering / AI reorder recommendations — shared types for UI and API.
 * Align field names with backend when GET endpoint exists (camelCase vs PascalCase mapper).
 */

export type StockoutRiskLevel = "high" | "medium" | "low";

export interface SmartOrderingRow {
  id: string;
  name: string;
  sku: string;
  category: string;
  /** Optional product image URL when media exists */
  imageUrl?: string | null;
  currentStock: number;
  maxCapacity: number;
  recommendedQty: number;
  recommendationNote: string;
  reasoning: string;
  stockoutRisk: StockoutRiskLevel;
  confidencePercent: number;
  confidenceLabel: string;
}

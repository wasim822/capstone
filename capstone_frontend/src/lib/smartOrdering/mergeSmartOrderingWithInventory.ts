import type { SmartOrderingRow } from "@/services/api/smart-ordering/smartOrdering.types";
import type { InventoryMergeRow } from "./loadSmartOrderingContext";

function normalizeSku(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Overwrites identity and stock fields from the DB; keeps AI fields (qty, reasoning, risk, etc.).
 */
export function mergeSmartOrderingRowsWithInventory(
  rows: SmartOrderingRow[],
  mergeBySkuKey: Map<string, InventoryMergeRow>,
): SmartOrderingRow[] {
  return rows.map((row) => {
    const key = normalizeSku(row.sku);
    const inv = key ? mergeBySkuKey.get(key) : undefined;
    if (!inv) {
      return row;
    }
    return {
      ...row,
      id: inv.id || row.id,
      name: inv.productName,
      sku: inv.sku,
      category: inv.category || row.category,
      currentStock: inv.quantity,
      imageUrl: inv.imageUrl || row.imageUrl,
    };
  });
}

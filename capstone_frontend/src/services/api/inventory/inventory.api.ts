import { http } from "../http";
import type { PagedApiResponse } from "../types";
import type { InventoryItemDTO, InventoryListQuery } from "./inventory.types";
import { mapInventoryItem, type InventoryItem } from "./inventory.mapper";

function toQueryString(params: InventoryListQuery): string {
  const usp = new URLSearchParams();
// only include params that have a value (skip undefined/null/empty)
  (Object.entries(params) as Array<[keyof InventoryListQuery, unknown]>).forEach(
    ([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      usp.set(String(k), String(v));
    }
  ); // object.entries returns [key, value] pairs, we filter out any pairs where value is undefined/null/empty, then add to URLSearchParams. This way we only include params that have a value, and skip any that are not set.

  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const inventoryApi = {
  async list(query: InventoryListQuery = {}) {
    const raw = (await http.raw<InventoryItemDTO[]>(
      `/api/inventory/list${toQueryString(query)}`
    )) as PagedApiResponse<InventoryItemDTO>;
// we get back the raw DTOs from the API, but we want to return our mapped InventoryItem objects. So we map each DTO to an InventoryItem using our mapper function.
    return {
      items: raw.Data.map(mapInventoryItem),
      total: raw.Total,
      page: raw.Page,
      pageSize: raw.PageSize,
      success: raw.Success,
      message: raw.Message,
    };// we return the mapped items along with the pagination info and success/message from the API response.
  },

  async getById(id: string): Promise<InventoryItem> {
    const dto = await http.data<InventoryItemDTO>(`/api/inventory/${id}`);
    return mapInventoryItem(dto);
  },

  async create(payload: Omit<InventoryItemDTO, "Id">): Promise<string> {
    return http.data<string>(`/api/inventory`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: InventoryItemDTO): Promise<string> {
    return http.data<string>(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<string> {
    return http.data<string>(`/api/inventory/${id}`, { method: "DELETE" });
  },
};

import { http } from "../http";
import type { PagedApiResponse } from "../types";
import type { InventoryReportDTO, InventoryReportListQuery } from "./reports.types";
import { mapInventoryReport, type InventoryReport } from "./reports.mapper";

function normalizeReportType(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (normalized === "lost") return "lost";
  if (normalized === "damaged") return "Damaged";
  if (normalized === "expired") return "Expired";
  if (normalized === "stolen") return "stolen";
  return undefined;
}

function toInventoryUpsertPayload(payload: Partial<InventoryReportDTO>): InventoryReportDTO {
  const reportType = normalizeReportType(payload.ReportType);
  return {
    ...(payload.Id ? { Id: payload.Id } : {}),
    ...(payload.ItemName?.trim() ? { ItemName: payload.ItemName.trim() } : {}),
    ...(payload.reportedBy?.trim() ? { reportedBy: payload.reportedBy.trim() } : {}),
    ...(reportType ? { ReportType: reportType, ReportTypeEnum: reportType } : {}),
    ...(payload.Description?.trim() ? { Description: payload.Description.trim() } : {}),
    ...(payload.AdditionalNotes?.trim()
      ? { AdditionalNotes: payload.AdditionalNotes.trim() }
      : {}),
  };
}

function toQueryString(params: InventoryReportListQuery): string {
  const usp = new URLSearchParams();
  (Object.entries(params) as Array<[keyof InventoryReportListQuery, unknown]>).forEach(
    ([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      usp.set(String(k), String(v));
    }
  );
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const inventoryReportApi = {
  async list(query: InventoryReportListQuery = {}) {
    const raw = (await http.raw<InventoryReportDTO[]>(
      `/api/inventory-reports/list${toQueryString(query)}`
    )) as PagedApiResponse<InventoryReportDTO>;
    return {
      items: raw.Data.map(mapInventoryReport),
      total: raw.Total,
      page: raw.Page,
      pageSize: raw.PageSize,
      success: raw.Success,
      message: raw.Message,
    };
  },

  async getById(id: string): Promise<InventoryReport> {
    const dto = await http.data<InventoryReportDTO>(`/api/inventory-reports/${id}`);
    return mapInventoryReport(dto);
  },

  async create(payload: Omit<InventoryReportDTO, "Id">): Promise<string> {
    const body = toInventoryUpsertPayload(payload);
    return http.data<string>(`/api/inventory-reports`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async update(id: string, payload: InventoryReportDTO): Promise<string> {
    const body = toInventoryUpsertPayload(payload);
    return http.data<string>(`/api/inventory-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
  },

  async remove(id: string): Promise<string> {
    return http.data<string>(`/api/inventory-reports/${id}`, { method: "DELETE" });
  },
};

import { http } from "../http";
import type { PagedApiResponse } from "../types";
import type { InjuryReportDTO, InjuryReportListQuery } from "./reports.types";
import { mapInjuryReport, type InjuryReport } from "./reports.mapper";

function toQueryString(params: InjuryReportListQuery): string {
  const usp = new URLSearchParams();
  (Object.entries(params) as Array<[keyof InjuryReportListQuery, unknown]>).forEach(
    ([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      usp.set(String(k), String(v));
    }
  );
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const injuryReportApi = {
  async list(query: InjuryReportListQuery = {}) {
    const raw = (await http.raw<InjuryReportDTO[]>(
      `/api/injury-reports/list${toQueryString(query)}`
    )) as PagedApiResponse<InjuryReportDTO>;
    return {
      items: raw.Data.map(mapInjuryReport),
      total: raw.Total,
      page: raw.Page,
      pageSize: raw.PageSize,
      success: raw.Success,
      message: raw.Message,
    };
  },

  async getById(id: string): Promise<InjuryReport> {
    const dto = await http.data<InjuryReportDTO>(`/api/injury-reports/${id}`);
    return mapInjuryReport(dto);
  },

  async create(payload: Omit<InjuryReportDTO, "id">): Promise<string> {
    return http.data<string>(`/api/injury-reports`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: InjuryReportDTO): Promise<string> {
    return http.data<string>(`/api/injury-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<string> {
    return http.data<string>(`/api/injury-reports/${id}`, { method: "DELETE" });
  },
};

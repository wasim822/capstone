import { http } from "../http";
import type { PagedApiResponse } from "../types";
import type { EmployeeReportDTO, EmployeeReportListQuery } from "./reports.types";
import { mapEmployeeReport, type EmployeeReport } from "./reports.mapper";

function toQueryString(params: EmployeeReportListQuery): string {
  const usp = new URLSearchParams();
  (Object.entries(params) as Array<[keyof EmployeeReportListQuery, unknown]>).forEach(
    ([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      usp.set(String(k), String(v));
    }
  );
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

export const employeeReportApi = {
  async list(query: EmployeeReportListQuery = {}) {
    const raw = (await http.raw<EmployeeReportDTO[]>(
      `/api/employee-reports/list${toQueryString(query)}`
    )) as PagedApiResponse<EmployeeReportDTO>;
    return {
      items: raw.Data.map(mapEmployeeReport),
      total: raw.Total,
      page: raw.Page,
      pageSize: raw.PageSize,
      success: raw.Success,
      message: raw.Message,
    };
  },

  async getById(id: string): Promise<EmployeeReport> {
    const dto = await http.data<EmployeeReportDTO>(`/api/employee-reports/${id}`);
    return mapEmployeeReport(dto);
  },

  async create(payload: Omit<EmployeeReportDTO, "Id">): Promise<string> {
    return http.data<string>(`/api/employee-reports`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: EmployeeReportDTO): Promise<string> {
    return http.data<string>(`/api/employee-reports/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string): Promise<string> {
    return http.data<string>(`/api/employee-reports/${id}`, { method: "DELETE" });
  },
};

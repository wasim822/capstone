import { http } from "../http";
import type { PagedApiResponse } from "../types";
import type { ApiRole } from "./roles.types";

export const rolesApi = {
  /** GET /api/role/list - returns all roles (optional RoleName filter) */
  async list(params?: { RoleName?: string }) {
    const search = params?.RoleName
      ? `?RoleName=${encodeURIComponent(params.RoleName)}`
      : "";
    return http.raw<ApiRole[]>(
      `/api/role/list${search}`
    ) as Promise<PagedApiResponse<ApiRole>>;
  },
};

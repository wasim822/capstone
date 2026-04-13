import { http } from "../http";

export interface ApiDepartment {
  Id: string;
  DepartmentName: string;
  Description?: string;
  IsActive: boolean;
}

export const departmentsApi = {
  async list() {
    return http.raw<ApiDepartment[]>(
      "/api/department/list"
    );
  },

  async create(payload: {
    DepartmentName: string;
    Description?: string;
  }) {
    return http.data("/api/department", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: {
    DepartmentName?: string;
    Description?: string;
    IsActive?: boolean;
  }) {
    return http.data(`/api/department/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string) {
    return http.data(`/api/department/${id}`, {
      method: "DELETE",
    });
  },
};
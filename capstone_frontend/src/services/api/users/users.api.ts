import {
  UsersListQuery,
  UsersListResponse,
  SaveUserDTO,
  ApiUser,
} from "./users.types";
import { http } from "../http";

const BASE_URL = "/api/user";

export const usersApi = {
  async getCurrent(): Promise<ApiUser> {
    return http.data<ApiUser>(`${BASE_URL}/current`);
  },

  async updateCurrent(payload: { firstName?: string; lastName?: string }) {
    return http.data<ApiUser>(`${BASE_URL}/current`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async list(query: UsersListQuery): Promise<UsersListResponse> {
    const params = new URLSearchParams({
      Page: String(query.Page),
      PageSize: String(query.PageSize),

      ...(query.Email && { Email: query.Email }),
      ...(query.FirstName && { FirstName: query.FirstName }),
      ...(query.LastName && { LastName: query.LastName }),
      ...(query.RoleName && { RoleName: query.RoleName }),
      ...(query.DepartmentName && { DepartmentName: query.DepartmentName }),
    });

    //send request using centralised http client ..
    return http.raw<ApiUser[]>(
      `${BASE_URL}/list?${params.toString()}`,
    ) as Promise<UsersListResponse>;
  },

  // API definitions ....
  async create(payload: SaveUserDTO) {
    return http.data<string>(BASE_URL, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async update(id: string, payload: SaveUserDTO) {
    return http.data<string>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async remove(id: string) {
    return http.data<string>(`${BASE_URL}/${id}`, {
      method: "DELETE",
    });
  },
};

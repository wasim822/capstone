// services/api/users/users.types.ts

export type UserRole = "admin" | "manager" | "staff";

export type UserStatus = "active" | "inactive";

/**
 * EXACT backend user model (UserModel)
 */
export interface ApiUser {
  Id: string;
  Username?: string;
  Email: string;
  FirstName: string;
  LastName: string;
  IsActive: boolean;

  Role?: {
    RoleName: string;
  };

  Department?: {
    Id: string;
    DepartmentName: string;
    IsActive: boolean;
  };

  CreatedAt?: string;
}

/**
 * What backend RETURNS
 */
export interface UserDTO {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

/**
 * Query for pagination + filters
 */
export interface UsersListQuery {
  Page: number;
  PageSize: number;
  Email?: string;
  FirstName?: string;
  LastName?: string;
  RoleName?: string;
  DepartmentName?: string;
}

/**
 * Create / Update payload
 */
export interface SaveUserDTO {
  Id?: string;
  Username?: string;
  Email?: string;
  Password?: string;
  FirstName?: string;
  LastName?: string;
  RoleId?: string;
  DepartmentId?: string | null; //allow removing department
  IsActive?: boolean;
}

/**
 * Backend response from:
 * GET /api/user/list
 * (PaginatedDataRespondModel<UserModel[]>)
 */
export type UsersListResponse = {
  Data: ApiUser[];
  Total: number;
  Page: number;
  PageSize: number;
  Success: boolean;
  Message: string | null;
};

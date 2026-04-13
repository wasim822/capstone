export interface ApiDepartment {
  Id: string;
  DepartmentName: string;
  Description?: string;
  IsActive: boolean;
}

export type DepartmentsListResponse = {
  Data: ApiDepartment[];
  Total: number;
  Page: number;
  PageSize: number;
  Success: boolean;
  Message: string | null;
};
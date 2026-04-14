export interface EmployeeReportDTO {
  id?: string;
  Id?: string;
  employeeId?: string;
  employeeName?: string;
  department?: string;
  reportType?: string;
  reportDate?: string;
  reportedBy?: string;
  description?: string;
  previousWarnings?: string;
  additionalNotes?: string;
  actionTaken?: string;
}

export interface InjuryReportDTO {
  Id?: string;
  id?: string;
  employeeName?: string;
  reportedBy?: string;
  injuryType?: string;
  description?: string;
  additionalNotes?: string;
  reportDate?: string;
  location?: string;
  witnesses?: string;
}

export interface InventoryReportDTO {
  id?: string;
  Id?: string;
  ItemName?: string;
  reportedBy?: string;
  ReportType?: string;
  ReportTypeEnum?: string;
  Description?: string;
  AdditionalNotes?: string;
}

export interface EmployeeReportListQuery {
  Page?: number;
  PageSize?: number;
  OrderColumn?: string;
  OrderDirection?: string;
  [key: string]: any;
}

export interface InjuryReportListQuery {
  Page?: number;
  PageSize?: number;
  OrderColumn?: string;
  OrderDirection?: string;
  [key: string]: any;
}

export interface InventoryReportListQuery {
  Page?: number;
  PageSize?: number;
  OrderColumn?: string;
  OrderDirection?: string;
  [key: string]: any;
}

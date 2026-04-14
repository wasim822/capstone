import type { EmployeeReportDTO, InjuryReportDTO, InventoryReportDTO } from "./reports.types";

export interface EmployeeReport {
  id: string;
  employeeId: string;
  employeeName: string;
  department?: string;
  reportType: string;
  reportDate: Date;
  reportedBy: string;
  description: string;
  previousWarnings?: string;
  additionalNotes?: string;
  actionTaken?: string;
}

export interface InjuryReport {
  id: string;
  employeeName: string;
  reportedBy: string;
  injuryType: string;
  description: string;
  additionalNotes?: string;
  reportDate: Date;
  location?: string;
  witnesses?: string;
}

export interface InventoryReport {
  id: string;
  itemName: string;
  reportedBy: string;
  reportType: string;
  description: string;
  additionalNotes?: string;
}

export function mapEmployeeReport(dto: EmployeeReportDTO): EmployeeReport {
  return {
    id: dto.id || dto.Id || "",
    employeeId: dto.employeeId || "",
    employeeName: dto.employeeName || "",
    department: dto.department,
    reportType: dto.reportType || "",
    reportDate: dto.reportDate ? new Date(dto.reportDate) : new Date(),
    reportedBy: dto.reportedBy || "",
    description: dto.description || "",
    previousWarnings: dto.previousWarnings,
    additionalNotes: dto.additionalNotes,
    actionTaken: dto.actionTaken,
  };
}

export function mapInjuryReport(dto: InjuryReportDTO): InjuryReport {
  return {
    id: dto.id || dto.Id || "",
    employeeName: dto.employeeName || "",
    reportedBy: dto.reportedBy || "",
    injuryType: dto.injuryType || "",
    description: dto.description || "",
    additionalNotes: dto.additionalNotes,
    reportDate: dto.reportDate ? new Date(dto.reportDate) : new Date(),
    location: dto.location,
    witnesses: dto.witnesses,
  };
}

export function mapInventoryReport(dto: InventoryReportDTO): InventoryReport {
  return {
    id: dto.id || dto.Id || "",
    itemName: dto.ItemName || "",
    reportedBy: dto.reportedBy || "",
    reportType: dto.ReportType || "",
    description: dto.Description || "",
    additionalNotes: dto.AdditionalNotes,
  };
}

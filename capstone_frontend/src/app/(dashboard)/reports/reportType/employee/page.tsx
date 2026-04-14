"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Input,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  Textarea,
  Stack,
} from "@mui/joy";
import SearchRounded from "@mui/icons-material/SearchRounded";
import { employeeReportApi } from "@/services/api/reports/employee-reports.api";
import type { EmployeeReport } from "@/services/api/reports/reports.mapper";
import type { EmployeeReportDTO } from "@/services/api/reports/reports.types";

const EMPLOYEE_REPORT_TYPES = [
  "attendance",
  "performance",
  "misconduct",
  "policy violation",
  "compliance and safety",
];

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function toIsoDateString(value?: string): string | undefined {
  if (!value) return undefined;
  return `${value}T00:00:00.000Z`;
}

function reportTypeChip(type: string) {
  const colorMap: Record<string, "success" | "warning" | "danger" | "primary"> = {
    attendance: "warning",
    performance: "primary",
    misconduct: "danger",
    "policy violation": "danger",
    "compliance and safety": "success",
  };
  return { color: colorMap[type] || "primary" };
}

function previewText(value?: string, limit: number = 44): string {
  if (!value) return "-";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export default function EmployeeReportsPage() {
  const pageSize = 5;

  const [reports, setReports] = useState<EmployeeReport[]>([]);
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] = useState<EmployeeReport | null>(null);
  const [deleteItem, setDeleteItem] = useState<EmployeeReport | null>(null);

  const [formData, setFormData] = useState<Partial<EmployeeReportDTO>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await employeeReportApi.list({
        Page: 1,
        PageSize: 1000,
        OrderColumn: "reportDate",
        OrderDirection: "desc",
      });
      setReports(res.items);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = useMemo(() => {
    let data = [...reports];

    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(
        (x) =>
          x.employeeName?.toLowerCase().includes(term) ||
          x.employeeId?.toLowerCase().includes(term) ||
          x.department?.toLowerCase().includes(term) ||
          x.description?.toLowerCase().includes(term)
      );
    }

    if (reportType) data = data.filter((x) => x.reportType === reportType);

    return data;
  }, [reports, search, reportType]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const pagedReports = filteredReports.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    return reports.filter((report) => {
      const d = new Date(report.reportDate);
      return d.getMonth() === month && d.getFullYear() === year;
    }).length;
  }, [reports]);

  const resetForm = () => {
    setFormData({});
  };

  const handleCreateOpen = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleEditOpen = (report: EmployeeReport) => {
    setSelected(report);
    setFormData({
      Id: report.id,
      employeeId: report.employeeId,
      employeeName: report.employeeName,
      department: report.department,
      reportType: report.reportType,
      reportDate: formatDate(report.reportDate),
      reportedBy: report.reportedBy,
      description: report.description,
      previousWarnings: report.previousWarnings,
      additionalNotes: report.additionalNotes,
      actionTaken: report.actionTaken,
    });
    setEditOpen(true);
  };

  const handleDeleteOpen = (report: EmployeeReport) => {
    setDeleteItem(report);
    setDeleteOpen(true);
  };

  const buildPayload = (): Omit<EmployeeReportDTO, "Id"> => {
    const trimmedEmployeeId = formData.employeeId?.trim() ?? "";

    return {
      ...(trimmedEmployeeId && isUuid(trimmedEmployeeId)
        ? { employeeId: trimmedEmployeeId }
        : {}),
      employeeName: formData.employeeName?.trim() || "",
      ...(formData.department?.trim() ? { department: formData.department.trim() } : {}),
      reportType: formData.reportType || "",
      ...(toIsoDateString(formData.reportDate) ? { reportDate: toIsoDateString(formData.reportDate) } : {}),
      reportedBy: formData.reportedBy?.trim() || "",
      description: formData.description?.trim() || "",
      ...(formData.previousWarnings?.trim()
        ? { previousWarnings: formData.previousWarnings.trim() }
        : {}),
      ...(formData.additionalNotes?.trim()
        ? { additionalNotes: formData.additionalNotes.trim() }
        : {}),
      ...(formData.actionTaken?.trim() ? { actionTaken: formData.actionTaken.trim() } : {}),
    };
  };

  const handleCreate = async () => {
    try {
      const payload = buildPayload();
      if (
        !payload.employeeName ||
        !payload.reportType ||
        !payload.reportDate ||
        !payload.reportedBy ||
        !payload.description
      ) {
        console.error("Required fields are missing for employee report create");
        return;
      }
      await employeeReportApi.create(payload);
      setCreateOpen(false);
      resetForm();
      fetchReports();
    } catch (error) {
      console.error("Failed to create report:", error);
    }
  };

  const handleUpdate = async () => {
    try {
      if (!selected?.id) return;
      const payload: EmployeeReportDTO = {
        Id: selected.id,
        ...buildPayload(),
      };
      if (
        !payload.employeeName ||
        !payload.reportType ||
        !payload.reportDate ||
        !payload.reportedBy ||
        !payload.description
      ) {
        console.error("Required fields are missing for employee report update");
        return;
      }
      await employeeReportApi.update(selected.id, payload);
      setEditOpen(false);
      setSelected(null);
      resetForm();
      fetchReports();
    } catch (error) {
      console.error("Failed to update report:", error);
    }
  };

  const handleDelete = async () => {
    try {
      if (!deleteItem?.id) return;
      await employeeReportApi.remove(deleteItem.id);
      setDeleteOpen(false);
      setDeleteItem(null);
      fetchReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
    }
  };

  return (
    <Box>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography level="h1">Employee Reports</Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Manage employee incidents and performance records
          </Typography>
        </Box>
        <Button size="sm" onClick={handleCreateOpen}>
          + Add Report
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(3, minmax(0, 1fr))" },
          gap: 2,
          mb: 3,
        }}
      >
        <Sheet variant="soft" color="primary" sx={{ p: 2, borderRadius: "lg" }}>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Total Reports
          </Typography>
          <Typography level="h3">{reports.length}</Typography>
        </Sheet>
        <Sheet variant="soft" color="neutral" sx={{ p: 2, borderRadius: "lg" }}>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Filtered Results
          </Typography>
          <Typography level="h3">{filteredReports.length}</Typography>
        </Sheet>
        <Sheet variant="soft" color="success" sx={{ p: 2, borderRadius: "lg" }}>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Reports This Month
          </Typography>
          <Typography level="h3">{thisMonthCount}</Typography>
        </Sheet>
      </Box>

      {/* FILTERS */}
      <Sheet variant="outlined" sx={{ p: 2, borderRadius: "lg", mb: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr auto" },
            gap: 2,
            alignItems: "center",
          }}
        >
          <Input
            startDecorator={<SearchRounded />}
            placeholder="Search by employee name, ID, or description"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            value={reportType}
            placeholder="Report Type"
            onChange={(_, v) => {
              setReportType(v ?? "");
              setPage(1);
            }}
          >
            <Option value="">All Types</Option>
            {EMPLOYEE_REPORT_TYPES.map((type) => (
              <Option key={type} value={type}>
                {capitalize(type)}
              </Option>
            ))}
          </Select>
          <Button
            variant="plain"
            color="neutral"
            onClick={() => {
              setSearch("");
              setReportType("");
              setPage(1);
            }}
          >
            Clear
          </Button>
        </Box>
      </Sheet>

      {/* TABLE */}
      <Sheet variant="outlined" sx={{ borderRadius: "lg" }}>
        <Box sx={{ overflowX: "auto" }}>
          <Table hoverRow stickyHeader sx={{ minWidth: 1000 }}>
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Report Type</th>
                <th>Date</th>
                <th>Reported By</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      Loading employee reports...
                    </Typography>
                  </td>
                </tr>
              )}

              {!loading && pagedReports.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      No reports found. Try a different filter or create a new report.
                    </Typography>
                  </td>
                </tr>
              )}

              {!loading &&
                pagedReports.map((report) => {
                  const chipColor = reportTypeChip(report.reportType);
                  return (
                    <tr key={report.id}>
                      <td>
                        <Typography level="title-sm">{report.employeeName}</Typography>
                        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                          ID: {report.employeeId || "-"}
                        </Typography>
                      </td>
                      <td>{report.employeeId || "-"}</td>
                      <td>{report.department || "-"}</td>
                      <td>
                        <Chip color={chipColor.color} size="sm" variant="soft">
                          {capitalize(report.reportType)}
                        </Chip>
                      </td>
                      <td>{formatDate(report.reportDate)}</td>
                      <td>{report.reportedBy}</td>
                      <td>{previewText(report.description)}</td>
                      <td>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Button
                            size="sm"
                            variant="plain"
                            onClick={() => handleEditOpen(report)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="plain"
                            color="danger"
                            onClick={() => handleDeleteOpen(report)}
                          >
                            Delete
                          </Button>
                        </Box>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </Table>
        </Box>

        {/* PAGINATION */}
        <Box sx={{ display: "flex", justifyContent: "space-between", p: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <Typography>
            Page {page} of {totalPages}
          </Typography>
          <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </Box>
      </Sheet>

      {/* CREATE/EDIT MODAL */}
      <Modal open={createOpen || editOpen} onClose={() => {
        setCreateOpen(false);
        setEditOpen(false);
        setSelected(null);
        resetForm();
      }}>
        <ModalDialog maxWidth="md" sx={{ width: { xs: "100%", md: 760 } }}>
          <DialogTitle>
            {editOpen ? "Edit Employee Report" : "Create Employee Report"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2.25}>
              <Typography level="title-sm">Basic Information</Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  gap: 2,
                }}
              >
                <FormControl>
                  <FormLabel>Employee Name *</FormLabel>
                  <Input
                    value={formData.employeeName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeName: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Employee ID (UUID, optional)</FormLabel>
                  <Input
                    value={formData.employeeId || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Department</FormLabel>
                  <Input
                    value={formData.department || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Reported By *</FormLabel>
                  <Input
                    value={formData.reportedBy || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, reportedBy: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Report Type *</FormLabel>
                  <Select
                    value={formData.reportType || ""}
                    onChange={(_, v) =>
                      setFormData({ ...formData, reportType: (v || "") as string })
                    }
                  >
                    {EMPLOYEE_REPORT_TYPES.map((type) => (
                      <Option key={type} value={type}>
                        {capitalize(type)}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>Report Date *</FormLabel>
                  <Input
                    type="date"
                    value={formData.reportDate || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, reportDate: e.target.value })
                    }
                  />
                </FormControl>
              </Box>

              <Divider inset="none" />
              <Typography level="title-sm">Incident Details</Typography>

              <FormControl>
                <FormLabel>Description *</FormLabel>
                <Textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  minRows={3}
                  placeholder="Describe what happened"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Previous Warnings</FormLabel>
                <Textarea
                  value={formData.previousWarnings || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, previousWarnings: e.target.value })
                  }
                  minRows={2}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Additional Notes</FormLabel>
                <Textarea
                  value={formData.additionalNotes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, additionalNotes: e.target.value })
                  }
                  minRows={2}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Action Taken</FormLabel>
                <Textarea
                  value={formData.actionTaken || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, actionTaken: e.target.value })
                  }
                  minRows={2}
                />
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                setCreateOpen(false);
                setEditOpen(false);
                setSelected(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editOpen ? handleUpdate : handleCreate}
              loading={loading}
            >
              {editOpen ? "Update" : "Create"}
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal open={deleteOpen} onClose={() => {
        setDeleteOpen(false);
        setDeleteItem(null);
      }}>
        <ModalDialog>
          <DialogTitle>Delete Report</DialogTitle>
          <DialogContent>
            Are you sure you want to delete the report for{" "}
            <strong>{deleteItem?.employeeName}</strong>? This action cannot be
            undone.
          </DialogContent>
          <DialogActions>
            <Button
              variant="plain"
              color="neutral"
              onClick={() => {
                setDeleteOpen(false);
                setDeleteItem(null);
              }}
            >
              Cancel
            </Button>
            <Button color="danger" onClick={handleDelete} loading={loading}>
              Delete
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

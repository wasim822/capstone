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
import { inventoryReportApi } from "@/services/api/reports/inventory-reports.api";
import type { InventoryReport } from "@/services/api/reports/reports.mapper";
import type { InventoryReportDTO } from "@/services/api/reports/reports.types";

const INVENTORY_REPORT_TYPES = [
  { label: "Lost", value: "lost" },
  { label: "Damaged", value: "Damaged" },
  { label: "Expired", value: "Expired" },
  { label: "Stolen", value: "stolen" },
] as const;

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function reportTypeChip(type: string) {
  const colorMap: Record<string, "danger" | "warning" | "primary"> = {
    lost: "danger",
    Damaged: "warning",
    Expired: "warning",
    stolen: "danger",
  };
  return { color: colorMap[type] || "primary" };
}

function normalizeInventoryReportType(type?: string): string {
  if (!type) return "";
  const normalized = type.trim().toLowerCase();
  if (normalized === "lost") return "lost";
  if (normalized === "damaged") return "Damaged";
  if (normalized === "expired") return "Expired";
  if (normalized === "stolen") return "stolen";
  return type;
}

function toReportTypeLabel(type: string): string {
  const normalized = normalizeInventoryReportType(type);
  const match = INVENTORY_REPORT_TYPES.find((item) => item.value === normalized);
  return match?.label || capitalize(type);
}

function previewText(value?: string, limit: number = 44): string {
  if (!value) return "-";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export default function InventoryReportsPage() {
  const pageSize = 5;

  const [reports, setReports] = useState<InventoryReport[]>([]);
  const [search, setSearch] = useState("");
  const [reportType, setReportType] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] = useState<InventoryReport | null>(null);
  const [deleteItem, setDeleteItem] = useState<InventoryReport | null>(null);

  const [formData, setFormData] = useState<Partial<InventoryReportDTO>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await inventoryReportApi.list({
        Page: 1,
        PageSize: 1000,
        OrderColumn: "ItemName",
        OrderDirection: "asc",
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
          x.itemName?.toLowerCase().includes(term) ||
          x.reportedBy?.toLowerCase().includes(term) ||
          x.description?.toLowerCase().includes(term)
      );
    }

    if (reportType) data = data.filter((x) => x.reportType.toLowerCase() === reportType.toLowerCase());

    return data;
  }, [reports, search, reportType]);

  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const pagedReports = filteredReports.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const criticalCount = useMemo(() => {
    return reports.filter((report) => {
      const normalized = normalizeInventoryReportType(report.reportType);
      return normalized === "lost" || normalized === "stolen";
    }).length;
  }, [reports]);

  const resetForm = () => {
    setFormData({});
  };

  const handleCreateOpen = () => {
    resetForm();
    setCreateOpen(true);
  };

  const handleEditOpen = (report: InventoryReport) => {
    setSelected(report);
    setFormData({
      Id: report.id,
      ItemName: report.itemName,
      reportedBy: report.reportedBy,
      ReportType: normalizeInventoryReportType(report.reportType),
      Description: report.description,
      AdditionalNotes: report.additionalNotes,
    });
    setEditOpen(true);
  };

  const handleDeleteOpen = (report: InventoryReport) => {
    setDeleteItem(report);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    try {
      const payload = {
        ItemName: formData.ItemName || "",
        reportedBy: formData.reportedBy || "",
        ReportType: normalizeInventoryReportType(formData.ReportType),
        Description: formData.Description || "",
        AdditionalNotes: formData.AdditionalNotes,
      };
      if (!payload.ReportType) {
        console.error("Report type is required for inventory report create");
        return;
      }
      await inventoryReportApi.create(payload);
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
      const payload: InventoryReportDTO = {
        Id: selected.id,
        ItemName: formData.ItemName || "",
        reportedBy: formData.reportedBy || "",
        ReportType: normalizeInventoryReportType(formData.ReportType),
        Description: formData.Description || "",
        AdditionalNotes: formData.AdditionalNotes,
      };
      if (!payload.ReportType) {
        console.error("Report type is required for inventory report update");
        return;
      }
      await inventoryReportApi.update(selected.id, payload);
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
      await inventoryReportApi.remove(deleteItem.id);
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
          <Typography level="h1">Inventory Reports</Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Track lost, damaged, expired, or stolen inventory items
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
        <Sheet variant="soft" color="danger" sx={{ p: 2, borderRadius: "lg" }}>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Critical (Lost/Stolen)
          </Typography>
          <Typography level="h3">{criticalCount}</Typography>
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
            placeholder="Search by item name or reported by"
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
            {INVENTORY_REPORT_TYPES.map((type) => (
              <Option key={type.value} value={type.value}>
                {type.label}
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
                <th>Item Name</th>
                <th>Report Type</th>
                <th>Reported By</th>
                <th>Description</th>
                <th>Additional Notes</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      Loading inventory reports...
                    </Typography>
                  </td>
                </tr>
              )}

              {!loading && pagedReports.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      No inventory reports found. Try another filter or add a report.
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
                        <Typography level="title-sm">{report.itemName}</Typography>
                        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                          Reported by {report.reportedBy || "-"}
                        </Typography>
                      </td>
                      <td>
                        <Chip
                          color={chipColor.color}
                          size="sm"
                          variant="soft"
                        >
                          {toReportTypeLabel(report.reportType)}
                        </Chip>
                      </td>
                      <td>{report.reportedBy}</td>
                      <td>{previewText(report.description)}</td>
                      <td>{previewText(report.additionalNotes, 26)}</td>
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
            {editOpen ? "Edit Inventory Report" : "Create Inventory Report"}
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
                  <FormLabel>Item Name *</FormLabel>
                  <Input
                    value={formData.ItemName || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ItemName: e.target.value })
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
                <FormControl sx={{ gridColumn: { xs: "auto", md: "span 2" } }}>
                  <FormLabel>Report Type *</FormLabel>
                  <Select
                    value={formData.ReportType || ""}
                    onChange={(_, v) =>
                      setFormData({ ...formData, ReportType: (v || "") as string })
                    }
                  >
                    {INVENTORY_REPORT_TYPES.map((type) => (
                      <Option key={type.value} value={type.value}>
                        {type.label}
                      </Option>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Divider inset="none" />
              <Typography level="title-sm">Issue Details</Typography>

              <FormControl>
                <FormLabel>Description *</FormLabel>
                <Textarea
                  value={formData.Description || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, Description: e.target.value })
                  }
                  minRows={3}
                  placeholder="Detailed description of the inventory issue"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Additional Notes</FormLabel>
                <Textarea
                  value={formData.AdditionalNotes || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, AdditionalNotes: e.target.value })
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
            <strong>{deleteItem?.itemName}</strong>? This action cannot be
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

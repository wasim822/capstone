"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  Input,
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
import { injuryReportApi } from "@/services/api/reports/injury-reports.api";
import type { InjuryReport } from "@/services/api/reports/reports.mapper";
import type { InjuryReportDTO } from "@/services/api/reports/reports.types";

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

function previewText(value?: string, limit: number = 44): string {
  if (!value) return "-";
  if (value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
}

export default function InjuryReportsPage() {
  const pageSize = 5;

  const [reports, setReports] = useState<InjuryReport[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [selected, setSelected] = useState<InjuryReport | null>(null);
  const [deleteItem, setDeleteItem] = useState<InjuryReport | null>(null);

  const [formData, setFormData] = useState<Partial<InjuryReportDTO>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await injuryReportApi.list({
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
          x.injuryType?.toLowerCase().includes(term) ||
          x.location?.toLowerCase().includes(term) ||
          x.description?.toLowerCase().includes(term)
      );
    }

    return data;
  }, [reports, search]);

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

  const handleEditOpen = (report: InjuryReport) => {
    setSelected(report);
    setFormData({
      id: report.id,
      employeeName: report.employeeName,
      reportedBy: report.reportedBy,
      injuryType: report.injuryType,
      description: report.description,
      additionalNotes: report.additionalNotes,
      reportDate: formatDate(report.reportDate),
      location: report.location,
      witnesses: report.witnesses,
    });
    setEditOpen(true);
  };

  const handleDeleteOpen = (report: InjuryReport) => {
    setDeleteItem(report);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    try {
      const payload = {
        employeeName: formData.employeeName || "",
        reportedBy: formData.reportedBy || "",
        injuryType: formData.injuryType || "",
        description: formData.description || "",
        additionalNotes: formData.additionalNotes,
        reportDate: formData.reportDate || "",
        location: formData.location,
        witnesses: formData.witnesses,
      };
      await injuryReportApi.create(payload);
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
      const payload: InjuryReportDTO = {
        id: selected.id,
        employeeName: formData.employeeName || "",
        reportedBy: formData.reportedBy || "",
        injuryType: formData.injuryType || "",
        description: formData.description || "",
        additionalNotes: formData.additionalNotes,
        reportDate: formData.reportDate || "",
        location: formData.location,
        witnesses: formData.witnesses,
      };
      await injuryReportApi.update(selected.id, payload);
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
      await injuryReportApi.remove(deleteItem.id);
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
          <Typography level="h1">Injury Reports</Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Track and manage workplace injury incidents
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
            gridTemplateColumns: { xs: "1fr", md: "2fr auto" },
            gap: 2,
            alignItems: "center",
          }}
        >
          <Input
            startDecorator={<SearchRounded />}
            placeholder="Search by employee name, injury type, or location"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Button
            variant="plain"
            color="neutral"
            onClick={() => {
              setSearch("");
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
                <th>Injury Type</th>
                <th>Date</th>
                <th>Location</th>
                <th>Reported By</th>
                <th>Witnesses</th>
                <th>Description</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      Loading injury reports...
                    </Typography>
                  </td>
                </tr>
              )}

              {!loading && pagedReports.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <Typography level="body-sm" sx={{ py: 3, textAlign: "center" }}>
                      No injury reports found. Try a different search or create a new report.
                    </Typography>
                  </td>
                </tr>
              )}

              {!loading &&
                pagedReports.map((report) => (
                  <tr key={report.id}>
                    <td>
                      <Typography level="title-sm">{report.employeeName}</Typography>
                      <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                        {report.location || "No location specified"}
                      </Typography>
                    </td>
                    <td>
                      <Chip size="sm" variant="soft" color="danger">
                        {report.injuryType}
                      </Chip>
                    </td>
                    <td>{formatDate(report.reportDate)}</td>
                    <td>{report.location || "-"}</td>
                    <td>{report.reportedBy}</td>
                    <td>{report.witnesses || "-"}</td>
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
                ))}
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
            {editOpen ? "Edit Injury Report" : "Create Injury Report"}
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
                  <FormLabel>Reported By *</FormLabel>
                  <Input
                    value={formData.reportedBy || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, reportedBy: e.target.value })
                    }
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Injury Type *</FormLabel>
                  <Input
                    value={formData.injuryType || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, injuryType: e.target.value })
                    }
                    placeholder="e.g., Fracture, Cut, Burn"
                  />
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
                <FormControl sx={{ gridColumn: { xs: "auto", md: "span 2" } }}>
                  <FormLabel>Location</FormLabel>
                  <Input
                    value={formData.location || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Workplace location"
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
                  placeholder="Detailed description of the injury"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Witnesses</FormLabel>
                <Input
                  value={formData.witnesses || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, witnesses: e.target.value })
                  }
                  placeholder="Names of witnesses (comma-separated)"
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
            Are you sure you want to delete the injury report for{" "}
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

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  Sheet,
  Table,
  Modal,
  ModalDialog,
  DialogContent,
  Stack,
  DialogTitle,
} from "@mui/joy";
import {
  departmentsApi,
  ApiDepartment,
} from "@/services/api/departments/departments.api";
import {
  DepartmentDialog,
  DepartmentForm,
} from "./components/DepartmentDialog";
import { Dropdown, Menu, MenuButton, MenuItem, IconButton } from "@mui/joy";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import { Chip } from "@mui/joy";
import { useAuth } from "@/auth/AuthProvider";

function getDepartmentSaveErrorMessage(error: unknown): string {
  const fallback = "Failed to save department. Please try again.";
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  const nameConflict =
    (normalized.includes("department") && normalized.includes("exist")) ||
    (normalized.includes("department") && normalized.includes("duplicate")) ||
    (normalized.includes("department") && normalized.includes("unique")) ||
    normalized.includes("ix_depart");

  if (nameConflict) {
    return "Department name already exists. Use a different name.";
  }

  if (normalized === "request failed (500)") {
    return "Could not save department due to a server conflict. The department name may already exist.";
  }

  return message;
}

export default function DepartmentsPage() {
  const router = useRouter();
  const { role } = useAuth();

  const [departments, setDepartments] = useState<ApiDepartment[]>([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ApiDepartment | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<ApiDepartment | null>(null);

  /** Only admin can access Departments; manager/staff redirected to dashboard (URL protection) */
  useEffect(() => {
    if (role !== undefined && role !== "admin") {
      router.replace("/dashboard");
    }
  }, [role, router]);

  async function loadDepartments() {
    try {
      setLoading(true);

      const res = await departmentsApi.list();
      setDepartments(res.Data ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === "admin") loadDepartments();
  }, [role]);

  /** Do not render page content for non-admin (redirect in progress) */
  if (role !== undefined && role !== "admin") {
    return null;
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography level="h1" sx={{ fontSize: "2.5rem", fontWeight: 700 }}>
            Departments
          </Typography>

          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Manage organization departments.
          </Typography>
        </Box>

        <Button
          size="md"
          color="primary"
          sx={{ mt: { xs: 1, md: 0 } }}
          onClick={() => {
            setEditing(null);
            setSubmitError(null);
            setDialogOpen(true);
          }}
        >
          + Add Department
        </Button>
      </Box>

      {/* Table */}
      <Sheet variant="outlined" sx={{ borderRadius: "lg", overflow: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography level="body-sm">
            Showing {departments.length} department(s)
          </Typography>
        </Box>

        <Table hoverRow sx={{ tableLayout: "fixed" }}>
          <thead>
            <tr>
              <th style={{ width: "30%" }}>Name</th>
              <th style={{ width: "45%" }}>Description</th>
              <th style={{ width: "15%" }}>Status</th>
              <th style={{ width: 80, textAlign: "right" }}></th>
            </tr>
          </thead>

          <tbody>
            {departments.map((d) => (
              <tr key={d.Id}>
                <td>{d.DepartmentName}</td>
                <td>
                  <Box
                    sx={{
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      minWidth: 0,
                    }}
                  >
                    <Typography level="body-sm" sx={{ whiteSpace: "pre-wrap" }}>
                      {d.Description || "—"}
                    </Typography>
                  </Box>
                </td>
                <td>
                  <Chip
                    size="sm"
                    color={d.IsActive ? "success" : "danger"}
                    variant="soft"
                    sx={{
                      minWidth: 58,
                      display: "inline-flex",
                      justifyContent: "center",
                      "& .MuiChip-label": { textAlign: "center" },
                      ...(!d.IsActive
                        ? {
                            bgcolor: "danger.softBg",
                            color: "danger.softColor",
                            opacity: 0.75,
                          }
                        : {}),
                    }}
                  >
                    {d.IsActive ? "Active" : "Inactive"}
                  </Chip>
                </td>
                <td style={{ textAlign: "right", paddingRight: "12" }}>
                  <Dropdown>
                    <MenuButton
                      slots={{ root: IconButton }}
                      slotProps={{
                        root: { size: "sm", variant: "soft", color: "neutral" },
                      }}
                    >
                      <MoreHorizIcon />
                    </MenuButton>

                    <Menu placement="bottom-end">
                      {/* EDIT */}
                      <MenuItem
                        onClick={() => {
                          setEditing(d);
                          setSubmitError(null);
                          setDialogOpen(true);
                        }}
                      >
                        Edit
                      </MenuItem>

                      {/* ENABLE / DISABLE */}
                      <MenuItem
                        onClick={async () => {
                          await departmentsApi.update(d.Id, {
                            IsActive: !d.IsActive,
                          });

                          await loadDepartments();
                        }}
                      >
                        {d.IsActive ? "Disable" : "Enable"}
                      </MenuItem>

                      {/* DELETE */}
                      <MenuItem
                        color="danger"
                        onClick={() => {
                          setSelected(d);
                          setDeleteOpen(true);
                        }}
                      >
                        Delete
                      </MenuItem>
                    </Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Sheet>

      <DepartmentDialog
        key={editing?.Id ?? "create"}
        open={dialogOpen}
        initial={
          editing
            ? {
                name: editing.DepartmentName,
                description: editing.Description ?? "",
              }
            : null
        }
        submitError={submitError}
        onClose={() => {
          setDialogOpen(false);
          setSubmitError(null);
        }}
        onSubmit={async (data) => {
          setSubmitError(null);
          try {
            if (editing) {
              await departmentsApi.update(editing.Id, {
                DepartmentName: data.name,
                Description: data.description,
              });
            } else {
              await departmentsApi.create({
                DepartmentName: data.name,
                Description: data.description,
              });
            }

            await loadDepartments();
            setDialogOpen(false);
            setEditing(null);
          } catch (err) {
            setSubmitError(getDepartmentSaveErrorMessage(err));
          }
        }}
      />

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <ModalDialog
          variant="outlined"
          role="alertdialog"
          sx={{ borderRadius: "lg", width: 420 }}
        >
          <DialogTitle>Delete department?</DialogTitle>

          <DialogContent>
            <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
              This action cannot be undone.
            </Typography>

            <Typography sx={{ mt: 1 }} fontWeight={600}>
              {selected?.DepartmentName}
            </Typography>

            <Stack
              direction="row"
              justifyContent="flex-end"
              spacing={1.5}
              sx={{ mt: 2 }}
            >
              <Button variant="outlined" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>

              <Button
                color="danger"
                onClick={async () => {
                  if (!selected) return;

                  await departmentsApi.remove(selected.Id);
                  await loadDepartments();

                  setDeleteOpen(false);
                  setSelected(null);
                }}
              >
                Delete
              </Button>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </Box>
  );
}

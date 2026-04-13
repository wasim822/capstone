"use client";

import { Sheet, Table, Typography, Chip, Box, IconButton } from "@mui/joy";
import { PeopleRowMenu } from "./PeopleRowMenu";
import { useAuth } from "@/auth/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";

/** Backend role name – used for "only SuperAdmin can edit/delete Admin users" */
export type BackendRoleName = "SuperAdmin" | "Admin" | "Manager" | "Staff";

/**
 * Shared Person type
 * (exported so page.tsx can reuse safely)
 */
export type Person = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Display name for sidebar when logged in; may differ from email.  */
  username?: string;
  role: "admin" | "manager" | "staff";
  /** Backend role name – e.g. "Admin" vs "SuperAdmin" for permission rules */
  backendRoleName?: BackendRoleName;
  department: string;
  status: "active" | "inactive";
  createdAt: string;
};

interface Props {
  people: Person[];
  loading?: boolean;
  /** Current user id – used to hide action menu on own row (cannot edit self) */
  currentUserId?: string;
  /** Backend role of current user – only SuperAdmin can edit/delete/disable Admin users */
  currentUserBackendRole?: BackendRoleName;
  onEditPerson?: (person: Person) => void;
  onDeletePerson?: (person: Person) => void;
  onToggleStatus?: (person: Person) => void;
  pagination?: React.ReactNode;
}

export function PeopleTable({
  people,
  loading,
  currentUserId,
  currentUserBackendRole,
  onEditPerson,
  pagination,
  onDeletePerson,
  onToggleStatus,
}: Props) {
  const { role } = useAuth();
  const effectiveRole = role ?? "staff";
  const { has } = usePermissions(effectiveRole);

  return (
    <Sheet
      variant="outlined"
      sx={{
        borderRadius: "lg",
        overflow: "hidden",
        width: "100%",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography level="body-sm">Showing {people.length} user(s)</Typography>
      </Box>

      {/* Responsive table container */}
      <Box sx={{ overflowX: "auto" }}>
        <Table
          stickyHeader
          hoverRow
          sx={{
            minWidth: 720, // prevents mobile squishing
            "& thead th": { fontWeight: 700 },
          }}
        >
          <thead>
            <tr>
              <th style={{ width: 220 }}>Name</th>
              <th style={{ width: 260 }}>Email</th>
              <th style={{ width: 160 }}>Department</th>
              <th style={{ width: 140 }}>Role</th>
              <th style={{ width: 140 }}>Status</th>
              <th style={{ width: 160 }}>Created</th>
              <th style={{ width: 60, textAlign: "right" }} />
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6}>
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography level="body-sm">Loading users...</Typography>
                  </Box>
                </td>
              </tr>
            ) : people.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <Box sx={{ py: 6, textAlign: "center" }}>
                    <Typography level="body-sm" color="neutral">
                      No users found.
                    </Typography>
                  </Box>
                </td>
              </tr>
            ) : (
              people.map((p) => {
                const isSelf = !!currentUserId && p.id === currentUserId;
                const isTargetSuperAdmin = p.backendRoleName === "SuperAdmin";

                // SuperAdmin is never editable from UI (industry standard); no action menu for SuperAdmin rows.
                // Admin cannot edit other Admins; SuperAdmin can edit Admin/Manager/Staff; Manager can edit Staff only.
                const canEditTarget =
                  !isSelf &&
                  !isTargetSuperAdmin &&
                  (currentUserBackendRole === "SuperAdmin" ||
                    (effectiveRole === "admin" &&
                      currentUserBackendRole === "Admin" &&
                      p.role !== "admin") ||
                    (effectiveRole === "manager" && p.role === "staff"));

                return (
                  <tr key={p.id}>
                    <td>
                      <Typography level="body-sm" fontWeight={600}>
                        {p.firstName} {p.lastName}
                      </Typography>
                    </td>

                    <td>{p.email}</td>

                    <td>
                      <Typography
                        level="body-sm"
                        sx={{
                          color:
                            p.department === "—" ? "text.tertiary" : "inherit",
                        }}
                      >
                        {p.department}
                      </Typography>
                    </td>

                    <td>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={
                          p.role === "admin"
                            ? "primary"
                            : p.role === "manager"
                              ? "warning"
                              : "neutral"
                        }
                        sx={{
                          minWidth: 80,
                          px: 0.5,
                          display: "inline-flex",
                          justifyContent: "center",
                          textTransform: "capitalize",
                          "& .MuiChip-label": { textAlign: "center" },
                          // Light: keep soft neutral (filled gray) like Admin/Manager — not outlined white on white.
                          // Dark: default neutral.soft is same as table surface — lift contrast only there.
                          ...(p.role === "staff"
                            ? {
                                "html[data-joy-color-scheme='dark'] &": {
                                  bgcolor: "rgba(255, 255, 255, 0.08)",
                                  border: "1px solid rgba(255, 255, 255, 0.22)",
                                  color: "var(--joy-palette-neutral-200)",
                                },
                              }
                            : {}),
                        }}
                      >
                        {p.backendRoleName === "SuperAdmin"
                          ? "Super Admin"
                          : p.role.charAt(0).toUpperCase() + p.role.slice(1)}
                      </Chip>
                    </td>

                    <td>
                      <Chip
                        size="sm"
                        color={p.status === "active" ? "success" : "danger"}
                        variant="soft"
                        sx={{
                          minWidth: 58,
                          display: "inline-flex",
                          justifyContent: "center",
                          "& .MuiChip-label": { textAlign: "center" },
                          ...(p.status === "inactive"
                            ? {
                                bgcolor: "danger.softBg",
                                color: "danger.softColor",
                                opacity: 0.75,
                              }
                            : {}),
                        }}
                      >
                        {p.status === "active" ? "Active" : "Inactive"}
                      </Chip>
                    </td>

                    <td>{p.createdAt}</td>

                    {/* Actions column */}
                    <td style={{ textAlign: "right", paddingRight: 12 }}>
                      {canEditTarget &&
                        (has("users.edit") ||
                          has("staff.edit") ||
                          has("users.delete") ||
                          has("staff.delete")) && (
                          <PeopleRowMenu
                            disabled={!canEditTarget}
                            isActive={p.status === "active"}
                            onEdit={() => onEditPerson?.(p)}
                            onToggle={() => onToggleStatus?.(p)}
                            onDelete={() => onDeletePerson?.(p)}
                          />
                        )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Box>

      {pagination && (
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {pagination}
        </Box>
      )}
    </Sheet>
  );
}

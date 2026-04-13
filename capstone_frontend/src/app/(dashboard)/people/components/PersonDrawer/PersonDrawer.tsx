"use client";

import { Drawer, Box, Typography, IconButton, Alert } from "@mui/joy";
import CloseIcon from "@mui/icons-material/Close";
import { Person, type BackendRoleName } from "../PeopleTable";
import { PersonForm, type PersonFormSubmitData } from "./PersonForm";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  person?: Person | null;
  currentUserRole: Person["role"];
  /** Backend role – only SuperAdmin can change another Admin's role/status */
  currentUserBackendRole?: BackendRoleName;
  departments: { id: string; name: string }[];
  /** Only roles that exist in DB (from GET /api/role/list) */
  availableRoles: { role: Person["role"]; label: string }[];
  onClose: () => void;
  onSubmit: (data: PersonFormSubmitData) => void | Promise<void>;
  /** Shown when API (create/update) fails */
  submitError?: string | null;
}

export function PersonDrawer({
  open,
  mode,
  person,
  currentUserRole,
  currentUserBackendRole,
  departments,
  availableRoles,
  onClose,
  onSubmit,
  submitError,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      anchor="right"
      size="md"
      sx={{
        "& .MuiDrawer-content": {
          width: { xs: "100%", sm: 420 },
        },
      }}
    >
      <Box
        sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography level="h4">
            {mode === "create" ? "Add Person" : "Edit Person"}
          </Typography>

          <IconButton variant="plain" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        {submitError && (
          <Alert color="danger" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <PersonForm
          key={person?.id ?? "create"}
          mode={mode}
          person={person}
          departments={departments}
          availableRoles={availableRoles}
          currentUserRole={currentUserRole}
          currentUserBackendRole={currentUserBackendRole}
          onSubmit={onSubmit}
        />
      </Box>
    </Drawer>
  );
}

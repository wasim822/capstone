"use client";

import * as React from "react";
import { IconButton, Dropdown, Menu, MenuButton, MenuItem } from "@mui/joy";

import MoreHorizIcon from "@mui/icons-material/MoreHoriz";

interface Props {
  disabled?: boolean;
  isActive?: boolean;
  onEdit?: () => void;
  onToggle?: () => void;
  onDelete?: () => void;
}

export function PeopleRowMenu({
  onEdit,
  disabled,
  isActive,
  onToggle,
  onDelete,
}: Props) {
  return (
    <Dropdown>
      <MenuButton
        slots={{ root: IconButton }}
        disabled={disabled}
        slotProps={{
          root: {
            size: "sm",
            variant: "soft",
            color: "neutral",
            sx: {
              opacity: disabled ? 0.35 : 0.75,
              transition: "opacity .15s ease",
              "&:hover": {
                opacity: disabled ? 0.35 : 1,
              },
            },
          },
        }}
      >
        <MoreHorizIcon />
      </MenuButton>

      <Menu placement="bottom-end">
        {onEdit && <MenuItem onClick={onEdit}>Edit</MenuItem>}

        {onToggle && (
          <MenuItem onClick={onToggle}>
            {isActive ? "Disable" : "Enable"}
          </MenuItem>
        )}

        {onDelete && (
          <MenuItem color="danger" onClick={onDelete}>
            Delete
          </MenuItem>
        )}
      </Menu>
    </Dropdown>
  );
}

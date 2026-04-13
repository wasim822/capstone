"use client";

import { Box, IconButton, Typography } from "@mui/joy";
import MenuIcon from "@mui/icons-material/Menu";
import ColorSchemeToggle from "./ColorSchemeToggle";

interface HeaderProps {
  onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  return (
    <Box
      sx={{
        display: { xs: "flex" },
        alignItems: "center",
        justifyContent: "space-between",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.surface",
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left - Menu */}
      <IconButton
        onClick={onMenuClick}
        sx={{ display: { xs: "inline-flex", md: "none" } }}
      >
        <MenuIcon />
      </IconButton>

      {/* Center - Title */}
      <Typography level="title-md">Capstone WMS</Typography>

      {/* Right - Theme Toggle */}
      <ColorSchemeToggle />
    </Box>
  );
}

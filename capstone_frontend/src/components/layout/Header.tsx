"use client";

import { Box, IconButton, Typography } from "@mui/joy";
import MenuIcon from "@mui/icons-material/Menu";
import ColorSchemeToggle from "./ColorSchemeToggle";

interface HeaderProps {
  onMenuClick: () => void;
  /** When false, hide the app title (sidebar or drawer already shows it). */
  showAppTitle?: boolean;
}

export default function Header({
  onMenuClick,
  showAppTitle = true,
}: HeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.surface",
        position: "sticky",
        top: 0,
        zIndex: 1100,
        gap: 1,
      }}
    >
      <IconButton
        onClick={onMenuClick}
        sx={{ display: { xs: "inline-flex", md: "none" }, flexShrink: 0 }}
      >
        <MenuIcon />
      </IconButton>

      {showAppTitle ? (
        <Typography
          level="title-md"
          sx={{
            flex: 1,
            textAlign: { xs: "center", md: "left" },
          }}
        >
          WareTrack
        </Typography>
      ) : (
        <Box sx={{ flex: 1 }} aria-hidden />
      )}

      <Box sx={{ flexShrink: 0, ml: "auto" }}>
        <ColorSchemeToggle />
      </Box>
    </Box>
  );
}

"use client";

import { Box, Drawer } from "@mui/joy";
import React from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import AuthGuard from "@/components/AuthGuard";
//import { UserRole } from "@/types/roles";
import { useAuth } from "@/auth/AuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  /**
   * Get user from authentication context
   */
  const { user } = useAuth();

  /**
   * Extract role safely; fallback to "staff" so Sidebar always receives a valid UserRole (e.g. during auth load).
   */
  const userRole = user?.role ?? "staff";
  return (
    <AuthGuard>

    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Desktop Sidebar (fixed so it doesn't scroll; wrapper reserves space) */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          width: collapsed ? 80 : 260,
          minHeight: "100vh",
          flexShrink: 0,
          transition: "width 0.2s ease",
        }}
      >
        <Sidebar
          userRole={userRole}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
        />
      </Box>

      {/* Mobile Drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        size="sm"
        variant="plain"
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-content": {
            width: 260,
            p: 0,
          },
        }}
      >
        <Sidebar
          userRole={userRole}
          collapsed={false}
          onToggleCollapse={() => {}}
          onNavigate={() => setMobileOpen(false)}
        />
      </Drawer>

      {/* Main Area */}
      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Header onMenuClick={() => setMobileOpen(true)} />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: "auto",
            p: 3,
            bgcolor: "background.body",
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
    </AuthGuard>
  );
}

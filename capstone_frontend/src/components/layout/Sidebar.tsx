"use client";

/**
 * Sidebar Component
 * -----------------
 * Features:
 * - Collapsible sidebar
 * - Role based navigation
 * - Tooltip when sidebar is collapsed
 * - Logout button
 * - Profile section
 */

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  Sheet,
  List,
  ListItemButton,
  ListItemContent,
  ListItemDecorator,
  Typography,
  Input,
  Divider,
  Box,
  Avatar,
  IconButton,
  Tooltip,
} from "@mui/joy";

import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import SearchIcon from "@mui/icons-material/Search";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";

import { navItems } from "@/config/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import { useUserProfileMedia } from "@/hooks/useUserProfileMedia";
import { UserRole } from "@/types/roles";
import { useAuth } from "@/auth/AuthProvider";
import { clearAuthCookie } from "@/lib/authCookies";

interface SidebarProps {
  userRole: UserRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

/**
 * Sidebar Navigation Item
 * Handles tooltip when collapsed
 */
function SidebarItem({
  icon,
  label,
  href,
  collapsed,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  collapsed: boolean;
  selected?: boolean;
  onClick?: () => void;
}) {
  const item = (
    <ListItemButton
      component={Link}
      href={href}
      selected={selected}
      onClick={onClick}
    >
      <ListItemDecorator>{icon}</ListItemDecorator>

      {!collapsed && <ListItemContent>{label}</ListItemContent>}
    </ListItemButton>
  );

  // If sidebar collapsed → show tooltip
  if (collapsed) {
    return (
      <Tooltip title={label} placement="right">
        {item}
      </Tooltip>
    );
  }

  return item;
}

export default function Sidebar({
  userRole,
  collapsed,
  onToggleCollapse,
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { logout, user, backendRoleName } = useAuth();
  const { avatarUrl, loadProfileMedia } = useUserProfileMedia(user?.id);

  // Refetch avatar when user navigates or refocuses tab so sidebar updates after profile image change (no full refresh).
  React.useEffect(() => {
    void loadProfileMedia();
  }, [pathname, loadProfileMedia]);

  React.useEffect(() => {
    const onFocus = () => void loadProfileMedia();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadProfileMedia]);

  // Optional: profile page can dispatch this after upload for instant sidebar update: window.dispatchEvent(new CustomEvent('profile-media-updated'))
  React.useEffect(() => {
    const onProfileMediaUpdated = () => void loadProfileMedia();
    window.addEventListener("profile-media-updated", onProfileMediaUpdated);
    return () => window.removeEventListener("profile-media-updated", onProfileMediaUpdated);
  }, [loadProfileMedia]);

  const roleLabel =
    backendRoleName === "SuperAdmin"
      ? "Super Admin"
      : user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "";

  const { has } = usePermissions(userRole);

  /** Staff: no People/Departments. Manager: People only. Admin: People + Departments. Hidden items (e.g. not ready for capstone) excluded. */
  const visibleItems = navItems.filter((item) => {
    if (item.hidden) return false;
    if (item.href === "/departments") return userRole === "admin";
    return has(item.permission);
  });

  /** Set to true to show Settings in sidebar (e.g. after capstone when feature is ready). */
  const showSettingsInNav = false;
  /** Set to true when sidebar search (nav filter / global search) is implemented. */
  const showSidebarSearch = false;
  /**
   * Logout Handler
   */
  function handleLogout() {
    clearAuthCookie(); // remove cookie
    logout(); // clear auth context
    router.push("/login"); // redirect
  }

  return (
    <Sheet
      component="aside"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        width: collapsed ? 80 : 260,
        height: "100vh",
        transition: "width 0.2s ease",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.surface",
        p: 2,
        zIndex: 10,
      }}
    >
      {/* -------------------------------- */}
      {/* Logo Section                     */}
      {/* -------------------------------- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          mb: 2,
        }}
      >
        <Box
          onClick={collapsed ? onToggleCollapse : undefined}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            cursor: collapsed ? "pointer" : "default",
          }}
        >
          {/* Logo Icon */}
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "md",
              bgcolor: "primary.500",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontWeight: 600,
            }}
          >
            C
          </Box>

          {!collapsed && (
            <Typography level="h4">Capstone WMS</Typography>
          )}
        </Box>

        {/* Collapse Button */}
        {!collapsed && (
          <IconButton
            onClick={onToggleCollapse}
            sx={{ display: { xs: "none", md: "inline-flex" } }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Box>

      {/* -------------------------------- */}
      {/* Search (hidden until implemented; set showSidebarSearch = true when ready) */}
      {/* -------------------------------- */}
      {showSidebarSearch && !collapsed && (
        <Input
          size="sm"
          startDecorator={<SearchIcon />}
          placeholder="Search"
          sx={{ mb: 2 }}
        />
      )}

      {/* -------------------------------- */}
      {/* Navigation                       */}
      {/* -------------------------------- */}
      <List sx={{ gap: 1 }}>
        {visibleItems.map((item) => (
          <SidebarItem
            key={item.href}
            icon={item.icon}
            label={item.label}
            href={item.href}
            collapsed={collapsed}
            selected={pathname === item.href}
            onClick={onNavigate}
          />
        ))}
      </List>

      {/* Push bottom section down */}
      <Box sx={{ flexGrow: 1 }} />

      {/* -------------------------------- */}
      {/* Settings (hidden for capstone; set showSettingsInNav = true to show) */}
      {/* -------------------------------- */}
      {showSettingsInNav && (
        <List sx={{ mt: "auto" }}>
          <SidebarItem
            icon={<SettingsIcon />}
            label="Settings"
            href="/settings"
            collapsed={collapsed}
            selected={pathname === "/settings"}
          />
        </List>
      )}

      <Divider sx={{ my: 2 }} />

      {/* -------------------------------- */}
      {/* Profile + Logout                 */}
      {/* -------------------------------- */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {/* Profile */}
        <ListItemButton
          component={Link}
          href="/profile"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexGrow: 1,
            borderRadius: "md",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
        >
          <Avatar size="sm" src={avatarUrl ?? undefined} alt="" />

          {!collapsed && (
            <Box>
              <Typography level="body-sm">{user?.name ?? "…"}</Typography>
              <Typography level="body-xs" color="neutral">
                {roleLabel}
              </Typography>
            </Box>
          )}
        </ListItemButton>

        {/* Logout Button */}
        {!collapsed && (
          <Tooltip title="Logout">
            <IconButton
              size="sm"
              variant="plain"
              color="neutral"
              onClick={handleLogout}
            >
              <LogoutIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Sheet>
  );
}
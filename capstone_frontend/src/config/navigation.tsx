import DashboardIcon from "@mui/icons-material/Dashboard";
import InventoryIcon from "@mui/icons-material/Inventory";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import MonitorIcon from "@mui/icons-material/Monitor";
import InsightsIcon from "@mui/icons-material/Insights";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PeopleIcon from "@mui/icons-material/People";
import AssignmentIcon from "@mui/icons-material/Assignment";
import { ReactNode } from "react";
import { Permission } from "@/types/permissions";
import ApartmentIcon  from "@mui/icons-material/Apartment";

export interface NavItem {
  label: string;
  href: string;
  permission: Permission;
  icon: ReactNode;
  section?: string;
  /** When true, hide from sidebar (e.g. not ready for capstone); keep route and code for later. */
  hidden?: boolean;
}

export const navItems: NavItem[] = [
  // ===== MAIN =====   //We attach a basic permission everyone has (inventory.view) so staff can still enter app.
  {
    label: "Dashboard",
    href: "/dashboard",
    permission: "dashboard.view", // basic access permission
    icon: <DashboardIcon />,
    section: "Main",
  },
  {
    label: "Inventory",
    href: "/inventory",
    permission: "inventory.view",
    icon: <InventoryIcon />,
    section: "Main",
  },
  {
    label: "Orders",
    href: "/orders",
    permission: "orders.view",
    icon: <ReceiptLongIcon />,
    section: "Main",
  },

  // ===== MANAGEMENT =====
  {
    label: "Activity Monitor",
    href: "/activity",
    permission: "tasks.view.all", //admin + manager only
    icon: <MonitorIcon />,
    section: "Management",
    hidden: true, // Not in scope for capstone; re-enable when feature is ready
  },
  {
    label: "Reports",
    href: "/reports",
    permission: "reports.view",
    icon: <AssessmentIcon />,
    section: "Management",
  },
  {
    label: "AI Insights",
    href: "/ai-insights",
    permission: "ai.view",
    icon: <InsightsIcon />,
    section: "Management",
    hidden: true, // Not in scope for capstone; re-enable when feature is ready
  },
  {
    label: "People Management",      //same route, different permission visibility....
    href: "/people",
    permission: "people.view", // managers
    icon: <PeopleIcon />,
    section: "Management",
  },
  {
    label: "Departments",      
    href: "/departments",
    permission: "people.view", 
    icon: <ApartmentIcon />,
    section: "Management",
  },
  // {
  //   label: "People Management",
  //   href: "/people",
  //   permission: "users.view", // admin
  //   icon: <PeopleIcon />,
  //   section: "Admin",
  // },
  // ===== TASKS =====
  {
    label: "My Tasks",
    href: "/my-tasks",
    permission: "tasks.view.own", //staff + manager
    icon: <AssignmentIcon />,
    section: "Tasks",
    hidden: true, // Not in scope for capstone; re-enable when feature is ready
  },
];

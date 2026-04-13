import { UserRole } from "@/types/roles";
import { Permission } from "@/types/permissions";

export const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    "dashboard.view",

    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.qr",

    "orders.view",
    "orders.create",
    "orders.edit",
    "orders.delete",

    "people.view",
    "users.view",
    "users.create",
    "users.edit",
    "users.delete",

    "tasks.view.all",
    "tasks.assign",
    "tasks.edit",
    "tasks.delete",
    //"tasks.view.own",
    "tasks.update.status",

    "reports.view",
    "ai.view",
  ],

  manager: [
    "dashboard.view",

    "inventory.view",
    "inventory.create",
    "inventory.edit",
    "inventory.delete",
    "inventory.qr",

    "orders.view",
    "orders.create",
    "orders.edit",
    "orders.delete",

    "people.view",
    //"users.view", //read-only visibility
    "staff.view",
    "staff.create",
    "staff.edit",
    "staff.delete",

    "tasks.view.all",
    "tasks.view.own",
    "tasks.assign",
    "tasks.edit",
    "tasks.delete",

    "reports.view",
    "ai.view",
  ],

  staff: [
    "dashboard.view",

    "inventory.view",
    "inventory.qr",
    "orders.view",
    "tasks.view.own",
    "tasks.update.status",
  ],
};

export type Permission =
  // Core
  | "people.view"
  | "dashboard.view"
  
  // Inventory
  | "inventory.view"
  | "inventory.create"
  | "inventory.edit"
  | "inventory.delete"
  | "inventory.qr"

  // Orders
  | "orders.view"
  | "orders.create"
  | "orders.edit"
  | "orders.delete"

  // Users
  | "users.view"
  | "users.create"
  | "users.edit"
  | "users.delete"

  // Staff
  | "staff.view"
  | "staff.create"
  | "staff.edit"
  | "staff.delete"

  // Tasks
  | "tasks.view.all" //management dashboard
  | "tasks.view.own" // My tasks page
  | "tasks.update.status"
  | "tasks.assign"
  | "tasks.edit"
  | "tasks.delete"

  // Reports & Insights
  | "reports.view"
  | "ai.view";

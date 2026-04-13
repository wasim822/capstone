// Orders types:
// defines backend DTOs, create/update payloads, enums, and query parameter shapes.


// Backend enum values used to represent an order's lifecycle state.
export enum OrderStatusEnum {
  Processing = "0",
  Pending = "1",
  Cancelled = "4",
  Completed = "6",
}

// Raw order item shape returned by the backend API.
export type OrderItemDTO = {
  Id: string;
  OrderId?: string | null;
  InventoryItemId?: string | null;
  ProductName?: string | null;
  Quantity?: number | string | null;
  UnitPrice?: number | string | null;
};

// Raw order shape returned by the backend API.
export type OrderDTO = {
  Id: string;
  OrderType?: string | null;
  OrderDate?: string | Date | null;
  OrderStatus?: OrderStatusEnum | string | number | null;
  OrderCompletedDate?: string | Date | null;
  CustomerName?: string | null;
  CustomerEmail?: string | null;
  Customer?: {
    Name?: string | null;
    Email?: string | null;
  } | null;
  OrderItems?: OrderItemDTO[] | null;
};

// Payload used when creating or updating a single order item.
export type UpsertOrderItemDTO = {
  Id?: string;
  OrderId?: string;
  InventoryItemId: string;
  Quantity?: number;
};

// Payload used when creating or updating an order.
export type UpsertOrderDTO = {
  Id?: string;
  OrderType?: string;
  OrderDate?: string | Date;
  OrderStatus: OrderStatusEnum | string;
  OrderCompletedDate?: string | Date;
  OrderItems?: UpsertOrderItemDTO[];
};

// Query options for paginated order list requests.
export type OrderListQuery = {
  Page?: number;
  PageSize?: number;

  Id?: string;
  OrderType?: string;
  OrderDate?: string;
  OrderStatus?: number | string;
  OrderCompletedDate?: string;

  OrderColumn?: "Id" | "OrderType" | "OrderDate" | "OrderStatus" | "OrderCompletedDate";
  OrderDirection?: "asc" | "ASC" | "desc" | "DESC";
};

// Query options for paginated order item list requests.
export type OrderItemListQuery = {
  Page?: number;
  PageSize?: number;

  Id?: string;
  OrderId?: string;
  InventoryItemId?: string;
  Quantity?: number;
  UnitPrice?: number;

  OrderColumn?: "Id" | "OrderId" | "InventoryItemId" | "Quantity" | "UnitPrice";
  OrderDirection?: "asc" | "ASC" | "desc" | "DESC";
};

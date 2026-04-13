// Orders mapper:

// converts raw backend DTOs into normalized frontend order and order-item models.
import type { OrderDTO, OrderItemDTO } from "./orders.types";

// Frontend shape used for a single order item in the UI.
export type OrderItem = {
  id: string;
  orderId: string;
  inventoryItemId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

// Frontend shape used for an order and its nested items.
export type Order = {
  id: string;
  orderType: string;
  orderDate: string;
  orderStatus: string;
  orderCompletedDate: string;
  customerName: string;
  customerEmail: string;
  orderItems: OrderItem[];
};

// Normalizes number-like API values into safe numeric values for the UI.
function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// Converts API date values into strings the app can store and display.
function toStringDate(value: string | Date | null | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.toISOString();
}

// Maps an order item DTO from the backend into the frontend model.
export function mapOrderItem(dto: OrderItemDTO): OrderItem {
  return {
    id: dto.Id,
    orderId: dto.OrderId ?? "",
    inventoryItemId: dto.InventoryItemId ?? "",
    productName: dto.ProductName ?? "",
    quantity: toNumber(dto.Quantity),
    unitPrice: toNumber(dto.UnitPrice),
  };
}

// Maps an order DTO from the backend into the frontend model.
export function mapOrder(dto: OrderDTO): Order {
  return {
    id: dto.Id,
    orderType: dto.OrderType ?? "",
    orderDate: toStringDate(dto.OrderDate),
    orderStatus:
      dto.OrderStatus === null || dto.OrderStatus === undefined
        ? ""
        : String(dto.OrderStatus),
    orderCompletedDate: toStringDate(dto.OrderCompletedDate),
    customerName: dto.Customer?.Name ?? dto.CustomerName ?? "",
    customerEmail: dto.Customer?.Email ?? dto.CustomerEmail ?? "",
    orderItems: (dto.OrderItems ?? []).map(mapOrderItem),
  };
}

import type { InventoryItemDTO } from "./inventory.types";

export type InventoryItem = {
  id: string; 
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  qrCodeValue: string;
  imageUrl: string;
  category: string;
  location: string;
  sku: string;
  status: string; // keep as string to match enum values "0","2","5"
};

export function mapInventoryItem(dto: InventoryItemDTO): InventoryItem {
  return {
    id: dto.Id,
    productName: dto.ProductName ?? "",
    description: dto.Description ?? "",
    quantity: dto.Quantity ?? 0,
    unitPrice:
      dto.UnitPrice === null || dto.UnitPrice === undefined
        ? 0
        : typeof dto.UnitPrice === "string"
        ? Number(dto.UnitPrice)
        : dto.UnitPrice,
    qrCodeValue: dto.QrCodeValue ?? "",
    imageUrl: dto.ImageUrl ?? "",
    category: dto.Category ?? "",
    location: dto.Location ?? "",
    sku: dto.Sku ?? "",
    status:
      dto.Status === null || dto.Status === undefined ? "0" : String(dto.Status),
  };
}

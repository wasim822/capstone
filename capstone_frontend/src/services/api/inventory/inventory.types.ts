export enum InventoryItemStatusEnum {
  InStock = "5",
  OutStock = "0",
  LowStock = "2",
}

export type InventoryItemDTO = {
  Id: string;
  ProductName?: string | null;
  Description?: string | null;
  Quantity?: number | null;
  UnitPrice?: number | string | null;
  QrCodeValue?: string | null;
  ImageUrl?: string | null;
  Category?: string | null;
  Location?: string | null;
  Sku?: string | null;
  Status?: number | string | null; // backend uses int, but keep as string to match enum values "0","2","5"
};

export type InventoryListQuery = {
  Page?: number;
  PageSize?: number;

  Sku?: string;
  ProductName?: string;
  Category?: string;
  Location?: string;
  Status?: number;

  OrderColumn?:
    | "ProductName"
    | "Quantity"
    | "UnitPrice"
    | "Category"
    | "Location"
    | "Sku"
    | "Status";
  OrderDirection?: "asc" | "ASC" | "desc" | "DESC";
};

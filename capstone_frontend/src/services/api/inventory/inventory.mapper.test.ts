import { mapInventoryItem } from "./inventory.mapper";

describe("mapInventoryItem", () => {
  it("applies defaults for missing nullable fields", () => {
    const dto = {
      Id: "1",
      ProductName: null,
      Description: null,
      Quantity: null,
      UnitPrice: null,
      QrCodeValue: null,
      ImageUrl: null,
      Category: null,
      Location: null,
      Sku: null,
      Status: null,
    };

    expect(mapInventoryItem(dto)).toEqual({
      id: "1",
      productName: "",
      description: "",
      quantity: 0,
      unitPrice: 0,
      qrCodeValue: "",
      imageUrl: "",
      category: "",
      location: "",
      sku: "",
      status: "0",
    });
  });

  it("normalizes unit price and status values", () => {
    const dto = {
      Id: "2",
      ProductName: "Desk",
      Description: "Office desk",
      Quantity: 8,
      UnitPrice: "12.5",
      QrCodeValue: "q-1",
      ImageUrl: "img",
      Category: "Furniture",
      Location: "A1",
      Sku: "SKU-1",
      Status: 5,
    };

    const mapped = mapInventoryItem(dto);

    expect(mapped.unitPrice).toBe(12.5);
    expect(mapped.status).toBe("5");
  });
});

import { inventoryApi } from "@/services/api/inventory/inventory.api";

export default async function InventoryDetail({ params }: any) {

  const item = await inventoryApi.getById(params.id);
// we fetch the inventory item by id from the API, then display its details. e.g if url is /inventory/123, we get the id "123" from params, call inventoryApi.getById("123") to fetch the item details, and then render them.
  return (
    <div>

      <h1>{item.productName}</h1>

      <p>SKU: {item.sku}</p>
      <p>Category: {item.category}</p>
      <p>Quantity: {item.quantity}</p>
      <p>Location: {item.location}</p>
      <p>Price: ${item.unitPrice}</p>

    </div>
  );
}
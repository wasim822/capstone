// Edit order dialog:
// loads a full order, lets users adjust its details and items, and reconciles inventory on save.
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  Input,
  Modal,
  ModalDialog,
  Option,
  Select,
  Sheet,
  Stack,
  Typography,
} from "@mui/joy";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import type { Order } from "@/services/api/orders/orders.mapper";
import { ordersApi } from "@/services/api/orders/orders.api";
import { searchInventory } from "@/services/api/inventory/inventory.search";
import { inventoryApi } from "@/services/api/inventory/inventory.api";
import {
  InventoryItemStatusEnum,
  type InventoryItemDTO,
} from "@/services/api/inventory/inventory.types";
import type { InventoryItem } from "@/services/api/inventory/inventory.mapper";
import { OrderStatusEnum } from "@/services/api/orders/orders.types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

type OrderFormValues = {
  OrderType: string;
  OrderDate: string;
  OrderStatus: string;
  OrderCompletedDate: string;
};

type EditableOrderItem = {
  orderItemId?: string;
  inventoryItemId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

type ConfirmAction = "save" | "cancel" | null;

// Formats a value for date input fields used by the dialog form.
function toDateInput(value?: string | Date) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Checks whether a text field contains a meaningful value.
function isNonEmpty(value: string) {
  return value.trim().length > 0;
}

// Formats currency totals for item rows and order summaries.
function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

// Maps a quantity to the inventory status value expected by the backend.
function getInventoryStatus(quantity: number): number {
  if (quantity <= 0) return Number(InventoryItemStatusEnum.OutStock);
  if (quantity <= 5) return Number(InventoryItemStatusEnum.LowStock);
  return Number(InventoryItemStatusEnum.InStock);
}

// Converts an order model into editable form values.
function toFormValues(order: Order): OrderFormValues {
  return {
    OrderType: String(order.orderType ?? ""),
    OrderDate: toDateInput(order.orderDate),
    OrderStatus: String(order.orderStatus ?? OrderStatusEnum.Pending),
    OrderCompletedDate: toDateInput(order.orderCompletedDate),
  };
}

// Creates a stable snapshot used to detect unsaved dialog changes.
function buildSnapshot(values: OrderFormValues, items: EditableOrderItem[]) {
  return JSON.stringify({
    OrderType: values.OrderType.trim(),
    OrderDate: values.OrderDate,
    OrderStatus: values.OrderStatus,
    OrderCompletedDate: values.OrderCompletedDate,
    OrderItems: [...items]
      .map((item) => ({
        inventoryItemId: item.inventoryItemId,
        quantity: item.quantity,
      }))
      .sort((a, b) => a.inventoryItemId.localeCompare(b.inventoryItemId)),
  });
}

// Converts an inventory model back into the DTO shape required for updates.
function mapInventoryToDto(item: InventoryItem, quantity: number): InventoryItemDTO {
  return {
    Id: item.id,
    ProductName: item.productName || null,
    Description: item.description || null,
    Quantity: quantity,
    UnitPrice: item.unitPrice,
    QrCodeValue: item.qrCodeValue || null,
    ImageUrl: item.imageUrl || null,
    Category: item.category || null,
    Location: item.location || null,
    Sku: item.sku || null,
    Status: getInventoryStatus(quantity),
  };
}

export default function EditOrderDialog({
  open,
  order,
  loading,
  error,
  onClose,
  onSaved,
}: {
  open: boolean;
  order: Order | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // Edit state mirrors the order metadata plus a mutable working set of order items.
  const [values, setValues] = useState<OrderFormValues>({
    OrderType: "",
    OrderDate: "",
    OrderStatus: String(OrderStatusEnum.Pending),
    OrderCompletedDate: "",
  });
  
  const [addedItems, setAddedItems] = useState<EditableOrderItem[]>([]);
  const [inventoryLookup, setInventoryLookup] = useState<Record<string, InventoryItem>>({});
  const [inventorySearch, setInventorySearch] = useState("");
  const debouncedInventorySearch = useDebouncedValue(inventorySearch, 350);
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState<string>("");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // Tracks the original reserved quantity per inventory item for stock reconciliation.
  const originalQuantities = useMemo(() => {
    const quantities = new Map<string, number>();
    if (!order) return quantities;

    order.orderItems.forEach((item) => {
      quantities.set(
        item.inventoryItemId,
        (quantities.get(item.inventoryItemId) ?? 0) + item.quantity,
      );
    });

    return quantities;
  }, [order]);

  const currentSnapshot = useMemo(
    () => buildSnapshot(values, addedItems),
    [addedItems, values],
  );
  const isDirty = initialSnapshot !== "" && currentSnapshot !== initialSnapshot;
  const orderTotal = addedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  useEffect(() => {
    // Opening the dialog loads the latest order state and seeds the dirty-check snapshot.
    if (!open || !order) {
      setValues({
        OrderType: "",
        OrderDate: "",
        OrderStatus: String(OrderStatusEnum.Pending),
        OrderCompletedDate: "",
      });
      setAddedItems([]);
      setInventoryLookup({});
      setInventorySearch("");
      setInventoryResults([]);
      setInventoryError(null);
      setErrors({});
      setApiError(null);
      setInitialSnapshot("");
      setConfirmAction(null);
      setInitializing(false);
      return;
    }

    const currentOrder = order;
    let cancelled = false;

    async function initialize() {
      try {
        setInitializing(true);
        setInventoryError(null);
        setErrors({});
        setApiError(null);
        setConfirmAction(null);
        setInventorySearch("");
        setInventoryResults([]);

        const lookupEntries = await Promise.all(
          currentOrder.orderItems.map(async (item) => {
            try {
              const inventoryItem = await inventoryApi.getById(item.inventoryItemId);
              return [item.inventoryItemId, inventoryItem] as const;
            } catch {
              return null;
            }
          }),
        );

        if (cancelled) return;

        const nextLookup = Object.fromEntries(
          lookupEntries.filter((entry): entry is readonly [string, InventoryItem] => entry !== null),
        );

        const nextItems = currentOrder.orderItems.map((item) => {
          const inventoryItem = nextLookup[item.inventoryItemId];
          return {
            orderItemId: item.id,
            inventoryItemId: item.inventoryItemId,
            productName:
              item.productName || inventoryItem?.productName || item.inventoryItemId || "Unnamed Item",
            sku: inventoryItem?.sku || "-",
            quantity: item.quantity,
            unitPrice: item.unitPrice || inventoryItem?.unitPrice || 0,
          };
        });

        const nextValues = toFormValues(currentOrder);
        setInventoryLookup(nextLookup);
        setAddedItems(nextItems);
        setValues(nextValues);
        setInitialSnapshot(buildSnapshot(nextValues, nextItems));
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : "Failed to load order details");
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [open, order]);

  useEffect(() => {
    // Inventory search supports adding new items to the selected order.
    if (!open || !order || initializing) return;
    let cancelled = false;

    async function runSearch() {
      try {
        setInventoryLoading(true);
        setInventoryError(null);

        const response = await searchInventory({
          term: debouncedInventorySearch.trim(),
          Page: 1,
          PageSize: 8,
          OrderColumn: "ProductName",
          OrderDirection: "asc",
        });

        if (cancelled) return;

        setInventoryResults(response.items);
        setInventoryLookup((prev) => {
          const next = { ...prev };
          response.items.forEach((item) => {
            next[item.id] = item;
          });
          return next;
        });
      } catch (err: unknown) {
        if (cancelled) return;
        setInventoryResults([]);
        setInventoryError(err instanceof Error ? err.message : "Failed to search inventory");
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    }

    void runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedInventorySearch, initializing, open, order]);

  // Calculates the maximum quantity this order can currently assign for one inventory item.
  function getQuantityAvailable(inventoryItemId: string) {
    // Existing order quantities count as already reserved, so users can reallocate them safely.
    const currentQuantity =
      addedItems.find((item) => item.inventoryItemId === inventoryItemId)?.quantity ?? 0;
    const originalQuantity = originalQuantities.get(inventoryItemId) ?? 0;
    const inventoryItem = inventoryLookup[inventoryItemId];

    if (!inventoryItem) return Math.max(originalQuantity, currentQuantity);

    return Math.max(inventoryItem.quantity + originalQuantity, currentQuantity);
  }

  // Updates one form field and clears any prior validation error for it.
  function setField(key: keyof OrderFormValues, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // Increments or decrements an item's quantity within allowed stock limits.
  function changeAddedQuantity(inventoryItemId: string, delta: number) {
    // Quantity edits stay within the stock that can be assigned to this order.
    setAddedItems((prev) =>
      prev.flatMap((item) => {
        if (item.inventoryItemId !== inventoryItemId) return [item];

        const nextQuantity = Math.min(
          getQuantityAvailable(inventoryItemId),
          Math.max(0, item.quantity + delta),
        );

        if (nextQuantity <= 0) return [];

        return [{ ...item, quantity: nextQuantity }];
      }),
    );
    setErrors((prev) => ({ ...prev, OrderItems: "" }));
  }

  // Adds an inventory result into the editable order item list.
  function addItem(item: InventoryItem) {
    // Adding an item merges into an existing row when the order already contains it.
    const maxQuantity = Math.max(
      item.quantity + (originalQuantities.get(item.id) ?? 0),
      addedItems.find((addedItem) => addedItem.inventoryItemId === item.id)?.quantity ?? 0,
    );

    if (maxQuantity <= 0) return;

    setAddedItems((prev) => {
      const existing = prev.find((x) => x.inventoryItemId === item.id);

      if (existing) {
        return prev.map((addedItem) =>
          addedItem.inventoryItemId === item.id
            ? {
                ...addedItem,
                productName: item.productName || addedItem.productName,
                sku: item.sku || addedItem.sku,
                unitPrice: item.unitPrice,
                quantity: Math.min(maxQuantity, addedItem.quantity + 1),
              }
            : addedItem,
        );
      }

      return [
        ...prev,
        {
          inventoryItemId: item.id,
          productName: item.productName || "Unnamed Item",
          sku: item.sku || "-",
          quantity: 1,
          unitPrice: item.unitPrice,
        },
      ];
    });
    setErrors((prev) => ({ ...prev, OrderItems: "" }));
  }

  // Removes one inventory item from the editable order.
  function removeItem(inventoryItemId: string) {
    setAddedItems((prev) => prev.filter((item) => item.inventoryItemId !== inventoryItemId));
  }

  // Validates order fields and stock availability before save.
  function validate() {
    // Validation prevents saving invalid order metadata or over-allocating stock.
    const next: Record<string, string> = {};
    if (!isNonEmpty(values.OrderType)) next.OrderType = "Order type is required";
    if (!isNonEmpty(values.OrderDate)) next.OrderDate = "Order date is required";
    if (!isNonEmpty(values.OrderStatus)) next.OrderStatus = "Status is required";
    if (addedItems.length === 0) next.OrderItems = "Add at least one inventory item";

    addedItems.forEach((item) => {
      const originalQuantity = originalQuantities.get(item.inventoryItemId) ?? 0;
      const inventoryItem = inventoryLookup[item.inventoryItemId];
      const availableStock = inventoryItem?.quantity ?? 0;
      const requiredAdditionalStock = Math.max(0, item.quantity - originalQuantity);

      if (requiredAdditionalStock > availableStock) {
        next.OrderItems = `${item.productName} does not have enough stock for this update`;
      }
    });

    return next;
  }

  // Closes the dialog immediately when confirmation is no longer needed.
  function closeWithoutConfirmation() {
    if (submitting) return;
    setConfirmAction(null);
    onClose();
  }

  // Intercepts close requests so unsaved edits can be confirmed first.
  function requestClose() {
    if (submitting) return;
    if (!isDirty) {
      closeWithoutConfirmation();
      return;
    }

    setConfirmAction("cancel");
  }

  // Opens the save confirmation modal if the form is valid.
  function requestSaveConfirmation() {
    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setConfirmAction("save");
  }

  // Persists order changes, item changes, and inventory adjustments.
  async function handleSave() {
    if (!order) return;
    const currentOrder = order;

    const nextErrors = validate();
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);

    try {
      // Save the order metadata first, then reconcile order items and inventory stock.
      const currentItemsByInventoryId = new Map(
        addedItems.map((item) => [item.inventoryItemId, item] as const),
      );
      const originalItemsByInventoryId = new Map(
        currentOrder.orderItems.map((item) => [item.inventoryItemId, item] as const),
      );

      await ordersApi.update(currentOrder.id, {
        Id: currentOrder.id,
        OrderType: values.OrderType.trim(),
        OrderDate: values.OrderDate,
        OrderStatus: values.OrderStatus,
        OrderCompletedDate: values.OrderCompletedDate || undefined,
      });

      await Promise.all(
        currentOrder.orderItems.map(async (item) => {
          const editedItem = currentItemsByInventoryId.get(item.inventoryItemId);

          if (!editedItem) {
            await ordersApi.removeItem(item.id);
            return;
          }

          if (editedItem.quantity !== item.quantity) {
            await ordersApi.updateItem(item.id, {
              Id: item.id,
              OrderId: currentOrder.id,
              InventoryItemId: item.inventoryItemId,
              Quantity: editedItem.quantity,
            });
          }
        }),
      );

      await Promise.all(
        addedItems
          .filter((item) => !originalItemsByInventoryId.has(item.inventoryItemId))
          .map((item) =>
            ordersApi.createItem({
              OrderId: currentOrder.id,
              InventoryItemId: item.inventoryItemId,
              Quantity: item.quantity,
            }),
          ),
      );

      const inventoryIds = new Set<string>([
        ...currentOrder.orderItems.map((item) => item.inventoryItemId),
        ...addedItems.map((item) => item.inventoryItemId),
      ]);

      await Promise.all(
        Array.from(inventoryIds).map(async (inventoryItemId) => {
          const originalQuantity = originalQuantities.get(inventoryItemId) ?? 0;
          const currentQuantity = currentItemsByInventoryId.get(inventoryItemId)?.quantity ?? 0;
          const delta = currentQuantity - originalQuantity;

          if (delta === 0) return;

          const inventoryItem =
            inventoryLookup[inventoryItemId] ?? (await inventoryApi.getById(inventoryItemId));
          const nextQuantity = Math.max(0, inventoryItem.quantity - delta);

          await inventoryApi.update(
            inventoryItemId,
            mapInventoryToDto(inventoryItem, nextQuantity),
          );
        }),
      );

      setConfirmAction(null);
      onSaved();
      onClose();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Failed to save order changes");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={requestClose}>
        <ModalDialog
          size="lg"
          sx={{
            width: { xs: "95vw", sm: 760 },
            borderRadius: "lg",
          }}
        >
          <DialogTitle>
            <Stack spacing={0.5}>
              <Typography level="h3">Edit Order</Typography>
              <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                Update order details and adjust the inventory items in this order.
              </Typography>
            </Stack>
          </DialogTitle>

          <DialogContent>
            {/* The body swaps between loading, error, and editable order content. */}
            {loading || initializing ? (
              <Typography level="body-sm">Loading order...</Typography>
            ) : error ? (
              <Typography level="body-sm" color="danger">
                {error}
              </Typography>
            ) : !order ? (
              <Typography level="body-sm" color="danger">
                Order details are unavailable.
              </Typography>
            ) : (
              <Stack spacing={2} sx={{ mt: 1 }}>
                {/* Save failures are shown once at the top of the editing workspace. */}
                {apiError ? (
                  <Typography level="body-sm" color="danger">
                    {apiError}
                  </Typography>
                ) : null}

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {/* Core order fields are grouped together for quick edits. */}
                  <FormControl error={Boolean(errors.OrderType)} sx={{ flex: 1 }}>
                    <FormLabel>Order Type</FormLabel>
                    <Input
                      value={values.OrderType}
                      onChange={(event) => setField("OrderType", event.target.value)}
                      placeholder="Sales, Restock..."
                      slotProps={{
                        input: {
                          minLength: 1,
                          maxLength: 50,
                        },               }}
                    />
                    {errors.OrderType ? <FormHelperText>{errors.OrderType}</FormHelperText> : null}
                  </FormControl>

                  <FormControl error={Boolean(errors.OrderStatus)} sx={{ flex: 1 }}>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={values.OrderStatus}
                      onChange={(_, value) => setField("OrderStatus", value ?? "")}
                      placeholder="Select status"
                      aria-label="Order status"
                    >
                      <Option value={OrderStatusEnum.Pending}>Pending</Option>
                      <Option value={OrderStatusEnum.Processing}>Processing</Option>
                      <Option value={OrderStatusEnum.Cancelled}>Cancelled</Option>
                      <Option value={OrderStatusEnum.Completed}>Completed</Option>
                    </Select>
                    {errors.OrderStatus ? (
                      <FormHelperText>{errors.OrderStatus}</FormHelperText>
                    ) : null}
                  </FormControl>
                </Stack>

                <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                  {/* Date fields stay together because status changes often affect them. */}
                  <FormControl error={Boolean(errors.OrderDate)} sx={{ flex: 1 }}>
                    <FormLabel>Order Date</FormLabel>
                    <Input
                      type="date"
                      value={values.OrderDate}
                      onChange={(event) => setField("OrderDate", event.target.value)}
                    />
                    {errors.OrderDate ? <FormHelperText>{errors.OrderDate}</FormHelperText> : null}
                  </FormControl>

                  <FormControl sx={{ flex: 1 }}>
                    <FormLabel>Completed Date</FormLabel>
                    <Input
                      type="date"
                      value={values.OrderCompletedDate}
                      onChange={(event) => setField("OrderCompletedDate", event.target.value)}
                    />
                  </FormControl>
                </Stack>

                <Stack spacing={1}>
                  {/* Search results let the user add more inventory into the order. */}
                  <Typography level="title-sm">Search Inventory Item</Typography>
                  <Input
                    value={inventorySearch}
                    onChange={(event) => setInventorySearch(event.target.value)}
                    placeholder="Search by product name or SKU"
                    slotProps={{
                      input: {
                        minLength: 1,
                        maxLength: 50,
                      },              }}
                  />

                  <Sheet variant="soft" sx={{ borderRadius: "sm", p: 1, maxHeight: 220, overflowY: "auto" }}>
                    {inventoryLoading ? (
                      <Typography level="body-sm">Searching inventory...</Typography>
                    ) : inventoryError ? (
                      <Typography level="body-sm" color="danger">
                        {inventoryError}
                      </Typography>
                    ) : inventoryResults.length === 0 ? (
                      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                        No inventory items found.
                      </Typography>
                    ) : (
                      <Stack spacing={1}>
                        {inventoryResults.map((item) => {
                          const quantityAvailable = Math.max(
                            item.quantity + (originalQuantities.get(item.id) ?? 0),
                            addedItems.find((addedItem) => addedItem.inventoryItemId === item.id)
                              ?.quantity ?? 0,
                          );
                          const addedItem = addedItems.find(
                            (addedOrderItem) => addedOrderItem.inventoryItemId === item.id,
                          );
                          const atMaxQuantity =
                            (addedItem?.quantity ?? 0) >= quantityAvailable;

                          return (
                            <Stack
                              key={item.id}
                              direction={{ xs: "column", sm: "row" }}
                              spacing={1}
                              justifyContent="space-between"
                              alignItems={{ xs: "stretch", sm: "center" }}
                              sx={{ p: 1, borderRadius: "sm", bgcolor: "background.surface" }}
                            >
                              <Box>
                                <Typography level="body-sm" fontWeight={600}>
                                  {item.productName || "Unnamed Item"}
                                </Typography>
                                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                                  SKU: {item.sku || "-"} | Qty: {quantityAvailable} | Price:{" "}
                                  {formatMoney(item.unitPrice)}
                                </Typography>
                              </Box>
                              <Button
                                size="sm"
                                variant="outlined"
                                disabled={quantityAvailable <= 0 || atMaxQuantity}
                                onClick={() => addItem(item)}
                              >
                                {addedItem ? `Add More (${addedItem.quantity})` : "Add Item"}
                              </Button>
                            </Stack>
                          );
                        })}
                      </Stack>
                    )}
                  </Sheet>
                </Stack>

                <Stack spacing={1}>
                  {/* This list is the editable working copy of the order contents. */}
                  <Typography level="title-sm">Items in Order</Typography>
                  {addedItems.length === 0 ? (
                    <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                      No items added yet.
                    </Typography>
                  ) : (
                    <Sheet variant="soft" sx={{ borderRadius: "sm", p: 1 }}>
                      <Stack spacing={1}>
                        {addedItems.map((item) => {
                          const quantityAvailable = getQuantityAvailable(item.inventoryItemId);

                          return (
                            <Stack
                              key={item.inventoryItemId}
                              direction={{ xs: "column", sm: "row" }}
                              justifyContent="space-between"
                              alignItems={{ xs: "stretch", sm: "center" }}
                              spacing={1}
                              sx={{ p: 1, borderRadius: "sm", bgcolor: "background.surface" }}
                            >
                              <Box>
                                <Typography level="body-sm" fontWeight={600}>
                                  {item.productName}
                                </Typography>
                                <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
                                  SKU: {item.sku} | Available: {quantityAvailable} | Unit:{" "}
                                  {formatMoney(item.unitPrice)}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  onClick={() => changeAddedQuantity(item.inventoryItemId, -1)}
                                >
                                  <RemoveIcon />
                                </IconButton>
                                <Typography
                                  level="body-sm"
                                  sx={{ minWidth: 92, textAlign: "center" }}
                                >
                                  {item.quantity} / {quantityAvailable}
                                </Typography>
                                <Typography
                                  level="body-sm"
                                  fontWeight={600}
                                  sx={{ minWidth: 88, textAlign: "center" }}
                                >
                                  {formatMoney(item.quantity * item.unitPrice)}
                                </Typography>
                                <IconButton
                                  size="sm"
                                  variant="outlined"
                                  disabled={item.quantity >= quantityAvailable}
                                  onClick={() => changeAddedQuantity(item.inventoryItemId, 1)}
                                >
                                  <AddIcon />
                                </IconButton>
                                <Button
                                  size="sm"
                                  variant="outlined"
                                  color="danger"
                                  onClick={() => removeItem(item.inventoryItemId)}
                                >
                                  Remove
                                </Button>
                              </Stack>
                            </Stack>
                          );
                        })}
                      </Stack>
                    </Sheet>
                  )}

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ mt: 1 }}
                    width="100%"
                  >
                    <Box>
                      <Typography level="title-md" sx={{ textAlign: "left", pt: 1 }}>
                        Total: {formatMoney(orderTotal)}
                      </Typography>
                      {errors.OrderItems ? (
                        <Typography level="body-sm" color="danger">
                          {errors.OrderItems}
                        </Typography>
                      ) : null}
                    </Box>

                    <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                      <Button
                        variant="outlined"
                        color="neutral"
                        onClick={requestClose}
                        disabled={submitting}
                      >
                        Cancel
                      </Button>
                      {isDirty ? (
                        <Button onClick={requestSaveConfirmation} loading={submitting}>
                          Save Changes
                        </Button>
                      ) : null}
                    </Stack>
                  </Stack>
                </Stack>
              </Stack>
            )}
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* A second modal confirms saving or discarding when the dialog is dirty. */}
      <Modal open={confirmAction !== null} onClose={() => setConfirmAction(null)}>
        {/* Confirm either saving or discarding once the order has unsaved changes. */}
        <ModalDialog size="sm">
          <DialogTitle>
            {confirmAction === "save" ? "Proceed With Order Changes?" : "Are You Sure You Want To Cancel?"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level="body-sm">
                {confirmAction === "save"
                  ? "Proceed with order changes and update inventory stock?"
                  : "Canceling will discard your unsaved order changes."}
              </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => setConfirmAction(null)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button
                  color={confirmAction === "save" ? "primary" : "danger"}
                  onClick={() => {
                    if (confirmAction === "save") {
                      void handleSave();
                      return;
                    }

                    closeWithoutConfirmation();
                  }}
                  loading={submitting && confirmAction === "save"}
                >
                  {confirmAction === "save" ? "Confirm Save" : "Confirm Cancel"}
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
}

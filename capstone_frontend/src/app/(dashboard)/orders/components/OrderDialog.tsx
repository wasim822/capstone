// Create order dialog:
// collects new order details, lets users attach inventory items, and submits the new order payload.
"use client";

import React, { useEffect, useState } from "react";
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
import { OrderStatusEnum, type UpsertOrderDTO } from "@/services/api/orders/orders.types";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { searchInventory } from "@/services/api/inventory/inventory.search";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import { InventoryItemStatusEnum } from "@/services/api/inventory/inventory.types";
import type { InventoryItem } from "@/services/api/inventory/inventory.mapper";

type OrderFormValues = {
  OrderType: string;
  OrderDate: string;
  OrderStatus: string;
  OrderCompletedDate: string;
};

type AddedOrderItem = {
  inventoryItemId: string;
  productName: string;
  sku: string;
  quantityAvailable: number;
  quantity: number;
  unitPrice: number;
};

// Formats a value for date input fields used by the form.
function toDateInput(value?: string | Date) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// Returns today's date in the format expected by date inputs.
function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

// Builds the initial form state for a new order.
function toFormValues(initial?: Partial<UpsertOrderDTO> | null): OrderFormValues {
  return {
    OrderType: String(initial?.OrderType ?? ""),
    OrderDate: toDateInput(initial?.OrderDate) || todayInput(),
    OrderStatus: String(initial?.OrderStatus ?? OrderStatusEnum.Pending),
    OrderCompletedDate: toDateInput(initial?.OrderCompletedDate),
  };
}

// Checks whether a text field contains a meaningful value.
function isNonEmpty(s: string) {
  return s.trim().length > 0;
}

// Formats currency totals for inventory rows and the order summary.
function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

export function OrderDialog({
  open,
  onClose,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: UpsertOrderDTO) => Promise<void>;
  submitting: boolean;
}) {
  // Form state covers order details, inventory search, and selected order items.
  const [values, setValues] = useState<OrderFormValues>(() => toFormValues());
  const [inventorySearch, setInventorySearch] = useState("");
  const debouncedInventorySearch = useDebouncedValue(inventorySearch, 350);
  const [inventoryResults, setInventoryResults] = useState<InventoryItem[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<AddedOrderItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [confirmAddOpen, setConfirmAddOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const orderTotal = addedItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  useEffect(() => {
    // Reset the dialog every time it opens so each new order starts clean.
    if (open) {
      setValues(toFormValues());
      setInventorySearch("");
      setInventoryResults([]);
      setInventoryLoading(false);
      setInventoryError(null);
      setAddedItems([]);
      setErrors({});
      setApiError(null);
      setConfirmAddOpen(false);
      setConfirmCancelOpen(false);
    }
  }, [open]);

  useEffect(() => {
    // Search inventory as the user types so they can attach items to the order.
    if (!open) return;
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
      } catch (err: unknown) {
        if (cancelled) return;
        setInventoryResults([]);
        setInventoryError(err instanceof Error ? err.message : "Failed to search inventory");
      } finally {
        if (!cancelled) setInventoryLoading(false);
      }
    }

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedInventorySearch, open]);

  // Updates one form field and clears any prior validation error for it.
  const setField = (key: keyof OrderFormValues, val: string) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  // Increments or decrements an added item's quantity within available stock.
  function changeAddedQuantity(inventoryItemId: string, delta: number) {
    // Quantity changes are capped by what is currently available in stock.
    setAddedItems((prev) =>
      prev.flatMap((item) => {
        if (item.inventoryItemId !== inventoryItemId) return [item];

        const nextQuantity = Math.min(
          item.quantityAvailable,
          Math.max(0, item.quantity + delta),
        );

        if (nextQuantity <= 0) return [];

        return [{ ...item, quantity: nextQuantity }];
      }),
    );
    setErrors((prev) => ({ ...prev, OrderItems: "" }));
  }

  // Restricts addable results to inventory that is currently available for ordering.
  function canAddItem(item: InventoryItem) {
    return (
      (item.status === InventoryItemStatusEnum.InStock || item.status === InventoryItemStatusEnum.LowStock) &&
      item.quantity > 0
    );
  }

  // Adds a searched inventory item into the pending order list.
  function addItem(item: InventoryItem) {
    // Re-adding an existing item increases its quantity instead of duplicating the row.
    if (!canAddItem(item)) return;

    setAddedItems((prev) => {
      const existing = prev.find((x) => x.inventoryItemId === item.id);

      if (existing) {
        return prev.map((added) =>
          added.inventoryItemId === item.id
            ? {
                ...added,
                quantityAvailable: item.quantity,
                unitPrice: item.unitPrice,
                quantity: Math.min(item.quantity, added.quantity + 1),
              }
            : added,
        );
      }

      return [
        ...prev,
        {
          inventoryItemId: item.id,
          productName: item.productName || "Unnamed Item",
          sku: item.sku || "-",
          quantityAvailable: item.quantity,
          quantity: 1,
          unitPrice: item.unitPrice,
        },
      ];
    });
    setErrors((prev) => ({ ...prev, OrderItems: "" }));
  }

  // Removes one inventory item from the pending order.
  function removeItem(inventoryItemId: string) {
    setAddedItems((prev) => prev.filter((x) => x.inventoryItemId !== inventoryItemId));
  }

  // Validates the order form before confirmation.
  function validate(v: OrderFormValues) {
    // Orders must have basic metadata plus at least one attached inventory item.
    const next: Record<string, string> = {};
    if (!isNonEmpty(v.OrderType)) next.OrderType = "Order type is required";
    if (!isNonEmpty(v.OrderDate)) next.OrderDate = "Order date is required";
    if (!isNonEmpty(v.OrderStatus)) next.OrderStatus = "Status is required";
    if (addedItems.length === 0) next.OrderItems = "Add at least one in-stock inventory item";
    return next;
  }

  // Submits the finished order payload to the parent page.
  async function handleSubmit() {
    // Build the backend payload from form state and selected inventory rows.
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;

    const payload: UpsertOrderDTO = {
      OrderType: values.OrderType.trim(),
      OrderDate: values.OrderDate,
      OrderStatus: values.OrderStatus,
      OrderCompletedDate: values.OrderCompletedDate || undefined,
      OrderItems: addedItems.map((item) => ({
        InventoryItemId: item.inventoryItemId,
        Quantity: item.quantity,
      })),
    };

    try {
      await onSubmit(payload);
      setConfirmAddOpen(false);
      onClose();
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  // Opens the add confirmation modal once validation passes.
  function requestSubmitConfirmation() {
    const nextErrors = validate(values);
    setErrors(nextErrors);
    setApiError(null);
    if (Object.keys(nextErrors).length > 0) return;
    setConfirmAddOpen(true);
  }

  // Opens the cancel confirmation modal before discarding work.
  function requestCancelConfirmation() {
    setConfirmCancelOpen(true);
  }

  return (
    <>
    <Modal open={open} onClose={requestCancelConfirmation}>
      <ModalDialog
        size="lg"
        sx={{
          width: { xs: "95vw", sm: 760 },
          borderRadius: "lg",
        }}
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography level="h3">Add New Order</Typography>
            <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
              Enter the details of the order to save it.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* Inline API errors appear above the form so they are hard to miss. */}
            {apiError ? (
              <Typography level="body-sm" color="danger">
                {apiError}
              </Typography>
            ) : null}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {/* Primary order fields live at the top for quick entry. */}
              <FormControl error={Boolean(errors.OrderType)} sx={{ flex: 1 }}>
                <FormLabel>Order Type</FormLabel>
                <Input
                  value={values.OrderType}
                  onChange={(e) => setField("OrderType", e.target.value)}
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
                  onChange={(_, v) => setField("OrderStatus", v ?? "")}
                  placeholder="Select status"
                  aria-label="Order status"
                >
                  <Option value={OrderStatusEnum.Pending}>Pending</Option>
                  <Option value={OrderStatusEnum.Processing}>Processing</Option>
                  <Option value={OrderStatusEnum.Cancelled}>Cancelled</Option>
                  <Option value={OrderStatusEnum.Completed}>Completed</Option>
                </Select>
                {errors.OrderStatus ? <FormHelperText>{errors.OrderStatus}</FormHelperText> : null}
              </FormControl>
            </Stack>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {/* Date fields are kept together because they are commonly edited as a pair. */}
              <FormControl error={Boolean(errors.OrderDate)} sx={{ flex: 1 }}>
                <FormLabel>Order Date</FormLabel>
                <Input
                  type="date"
                  value={values.OrderDate}
                  onChange={(e) => setField("OrderDate", e.target.value)}
                />
                {errors.OrderDate ? <FormHelperText>{errors.OrderDate}</FormHelperText> : null}
              </FormControl>

              <FormControl sx={{ flex: 1 }}>
                <FormLabel>Completed Date</FormLabel>
                <Input
                  type="date"
                  value={values.OrderCompletedDate}
                  onChange={(e) => setField("OrderCompletedDate", e.target.value)}
                />
              </FormControl>
            </Stack>

            <Stack spacing={1}>
              {/* Inventory search lets the user pull items into the order before saving. */}
              <Typography level="title-sm">Search Inventory Item</Typography>
              <Input
                value={inventorySearch}
                onChange={(e) => setInventorySearch(e.target.value)}
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
                      const inStock = canAddItem(item);
                      const addedItem = addedItems.find((x) => x.inventoryItemId === item.id);
                      const atMaxQuantity = (addedItem?.quantity ?? 0) >= item.quantity;
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
                              SKU: {item.sku || "-"} | Qty: {item.quantity} | Price: {formatMoney(item.unitPrice)}
                            </Typography>
                            {!inStock ? (
                              <Typography level="body-xs" color="warning">
                                Not in stock
                              </Typography>
                            ) : null}
                          </Box>
                          <Button
                            size="sm"
                            variant="outlined"
                            disabled={!inStock || atMaxQuantity}
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
              {/* This list is the pending contents of the order being created. */}
              <Typography level="title-sm">Items Added to Order</Typography>
              {addedItems.length === 0 ? (
                <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
                  No items added yet.
                </Typography>
              ) : (
                <Sheet variant="soft" sx={{ borderRadius: "sm", p: 1 }}>
                  <Stack spacing={1}>
                    {addedItems.map((item) => (
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
                            SKU: {item.sku} | In stock: {item.quantityAvailable} | Unit: {formatMoney(item.unitPrice)}
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
                          <Typography level="body-sm" sx={{ minWidth: 92, textAlign: "center" }}>
                            {item.quantity} / {item.quantityAvailable}
                          </Typography>
                          <Typography level="body-sm" fontWeight={600} sx={{ minWidth: 88, textAlign: "center" }}>
                            {formatMoney(item.quantity * item.unitPrice)}
                          </Typography>
                          <IconButton
                            size="sm"
                            variant="outlined"
                            disabled={item.quantity >= item.quantityAvailable}
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
                    ))}
                  </Stack>
                </Sheet>
              )}

              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }} width={"100%"}>
                {addedItems.length > 0 ? (
                  <Typography level="title-md" sx={{ textAlign: "left", pt: 1 }}>
                    Total: {formatMoney(orderTotal)}
                  </Typography>
                ) : <Typography level="title-md" sx={{ textAlign: "left", pt: 1 }}>Total: $0.00</Typography>}
                {errors.OrderItems ? (
                  <Typography level="body-sm" color="danger">
                    {errors.OrderItems}
                  </Typography>
                ) : null}

                <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }} alignSelf="right">
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={requestCancelConfirmation}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={requestSubmitConfirmation} loading={submitting}>
                    Add Order
                  </Button>

                </Stack>
              </Stack>
            </Stack>
          </Stack>
        </DialogContent>
      </ModalDialog>

    </Modal>
      {/* Confirmation modal shown before the order is actually created. */}
      <Modal open={confirmAddOpen} onClose={() => setConfirmAddOpen(false)}>
        {/* Confirm before finalizing the order and adjusting inventory. */}
        <ModalDialog size="sm">
          <DialogTitle>Confirm Order</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level="body-sm">
                Add this order with a total of {formatMoney(orderTotal)}?
              </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => setConfirmAddOpen(false)}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button onClick={handleSubmit} loading={submitting}>
                  Confirm Add
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>

      {/* Confirmation modal shown before the draft order is discarded. */}
      <Modal open={confirmCancelOpen} onClose={() => setConfirmCancelOpen(false)}>
        {/* Confirm before discarding the in-progress order. */}
        <ModalDialog size="sm">
          <DialogTitle>Discard Order?</DialogTitle>
          <DialogContent>
            <Stack spacing={2}>
              <Typography level="body-sm">
                Canceling will discard the current order details and selected items.
              </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <Button
                  variant="outlined"
                  color="neutral"
                  onClick={() => setConfirmCancelOpen(false)}
                >
                  Keep Editing
                </Button>
                <Button
                  color="danger"
                  onClick={() => {
                    setConfirmCancelOpen(false);
                    onClose();
                  }}
                >
                  Confirm Cancel
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </ModalDialog>
      </Modal>
    </>
  );
}

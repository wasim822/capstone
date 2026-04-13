// View order dialog:
// shows a read-only summary of one order and resolves missing product names when needed.
'use client';

import {
  Box,
  Sheet,
  Typography,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  Stack,
  Button,
  Divider,
} from '@mui/joy';
import { useEffect, useState } from 'react';
import { inventoryApi } from '@/services/api/inventory/inventory.api';
import type { Order } from '@/services/api/orders/orders.mapper';

type ViewOrderDialogProps = {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  order: Order | null;
};

// Converts backend status values into user-facing status labels.
function toStatusLabel(status: string): string {
  if (status === '0') return 'Processing';
  if (status === '1') return 'Pending';
  if (status === '4') return 'Cancelled';
  if (status === '6') return 'Completed';
  return 'Unknown';
}

// Formats order dates for display in the read-only view.
function toDisplayDate(value: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

// Formats currency values for item rows and totals.
function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

// Renders one labeled read-only field in the order summary.
function FormField({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ flex: 1 }}>
      <Typography level="body-xs" sx={{ color: 'text.tertiary', mb: 0.5 }}>
        {label}
      </Typography>
      <Sheet variant="soft" sx={{ borderRadius: 'sm', p: 1.25 }}>
        <Typography level="body-sm">{value || '-'}</Typography>
      </Sheet>
    </Box>
  );
}

export default function ViewOrderDialog({
  open,
  onClose,
  loading,
  error,
  order,
}: ViewOrderDialogProps) {
  // Resolved names fill gaps when an order item only has an inventory id.
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});
  const total = order
    ? order.orderItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    : 0;

  useEffect(() => {
    // Some orders do not include product names, so we look them up lazily for display.
    if (!open || !order) return;

    const itemIdsToResolve = Array.from(
      new Set(
        order.orderItems
          .filter((item) => !item.productName && item.inventoryItemId)
          .map((item) => item.inventoryItemId),
      ),
    );

    if (itemIdsToResolve.length === 0) return;

    let cancelled = false;

    async function loadNames() {
      const entries = await Promise.all(
        itemIdsToResolve.map(async (inventoryItemId) => {
          try {
            const inventoryItem = await inventoryApi.getById(inventoryItemId);
            return [inventoryItemId, inventoryItem.productName || inventoryItemId] as const;
          } catch {
            return [inventoryItemId, inventoryItemId] as const;
          }
        }),
      );

      if (!cancelled) {
        setResolvedNames(Object.fromEntries(entries));
      }
    }

    void loadNames();

    return () => {
      cancelled = true;
    };
  }, [open, order]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog
        size="lg"
        sx={{
          width: { xs: '95vw', sm: 760 },
          borderRadius: 'lg',
        }}
      >
        <DialogTitle>
          <Stack spacing={0.5}>
            <Typography level="h3">View Order</Typography>
            <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
              Review the order details and included inventory items.
            </Typography>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {/* The dialog swaps between loading, error, and detail states. */}
            {loading ? (
              <Typography level="body-sm">Loading order...</Typography>
            ) : error ? (
              <Typography level="body-sm" color="danger">
                {error}
              </Typography>
            ) : order ? (
              <>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {/* Summary fields mirror the order metadata shown in the table. */}
                  <FormField label="Order Type" value={order.orderType || '-'} />
                  <FormField label="Status" value={toStatusLabel(order.orderStatus)} />
                </Stack>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <FormField label="Order Date" value={toDisplayDate(order.orderDate)} />
                  <FormField
                    label="Completed Date"
                    value={toDisplayDate(order.orderCompletedDate)}
                  />
                </Stack>

                <Stack spacing={1}>
                  {/* Item rows break down the inventory included in the order. */}
                  <Typography level="title-sm">Items in Order</Typography>
                  {order.orderItems.length === 0 ? (
                    <Typography level="body-sm" sx={{ color: 'text.tertiary' }}>
                      No inventory items attached to this order.
                    </Typography>
                  ) : (
                    <Sheet variant="soft" sx={{ borderRadius: 'sm', p: 1 }}>
                      <Stack spacing={1}>
                        {order.orderItems.map((item) => (
                          <Stack
                            key={item.id}
                            direction={{ xs: 'column', sm: 'row' }}
                            justifyContent="space-between"
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            spacing={1}
                            sx={{ p: 1, borderRadius: 'sm', bgcolor: 'background.surface' }}
                          >
                            <Box>
                              <Typography level="body-sm" fontWeight={600}>
                                {item.productName ||
                                  resolvedNames[item.inventoryItemId] ||
                                  item.inventoryItemId ||
                                  'Unnamed Item'}
                              </Typography>
                              <Typography level="body-xs" sx={{ color: 'text.tertiary' }}>
                                {item.inventoryItemId}
                              </Typography>
                            </Box>
                            <Stack direction="row" spacing={2}>
                              <Typography level="body-sm">Qty: {item.quantity}</Typography>
                              <Typography level="body-sm">
                                Price: {formatMoney(item.unitPrice * item.quantity)}
                              </Typography>
                            </Stack>
                          </Stack>
                        ))}
                      </Stack>
                    </Sheet>
                  )}
                </Stack>

                <Divider />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography level="title-md">Total: {formatMoney(total)}</Typography>
                  <Button onClick={onClose}>Close</Button>
                </Stack>
              </>
            ) : null}
          </Stack>
        </DialogContent>
      </ModalDialog>
    </Modal>
  );
}

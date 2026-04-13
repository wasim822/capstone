"use client";

import React, { useEffect, useMemo, useState } from "react";

import {
  Box,
  Button,
  Chip,
  Input,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
  Modal,
  ModalDialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/joy";

import SearchRounded from "@mui/icons-material/SearchRounded";

import { inventoryApi } from "@/services/api/inventory/inventory.api";

import {
  InventoryItemStatusEnum,
  type InventoryListQuery,
  type InventoryItemDTO
} from "@/services/api/inventory/inventory.types";

import { type InventoryItem } from "@/services/api/inventory/inventory.mapper";

import { InventoryRowMenu } from "@/components/inventory/InventoryRowMenu";
import { InventoryItemDialog } from "@/components/inventory/InventoryItemDialog";
import InventoryQrModal from "@/components/inventory/InventoryQrModal";

function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function money(n: number) {
  return `$${n.toFixed(2)}`;
}

function statusChip(status: string) {
  switch (status) {
    case InventoryItemStatusEnum.InStock:
      return { label: "In Stock", color: "success" as const };

    case InventoryItemStatusEnum.LowStock:
      return { label: "Low Stock", color: "warning" as const };

    default:
      return { label: "Out of Stock", color: "danger" as const };
  }
}

export default function InventoryPage() {
  const pageSize = 6;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("");
  const [status, setStatus] = useState<InventoryItemStatusEnum | null>(null);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const [selected, setSelected] = useState<InventoryItem | null>(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalValue, setQrModalValue] = useState("");

  /* DELETE STATE */
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<InventoryItem | null>(null);

  const categoryOptions = useMemo(
    () => ["", "Electronics", "Furniture", "Safety", "Supplies", "Tools"],
    []
  );

  const statusOptions = useMemo(
    () => [
      { value: null, label: "All" },
      { value: InventoryItemStatusEnum.InStock, label: "In Stock" },
      { value: InventoryItemStatusEnum.LowStock, label: "Low Stock" },
      { value: InventoryItemStatusEnum.OutStock, label: "Out of Stock" }
    ],
    []
  );

  useEffect(() => {
    async function fetchItems() {
      const query: InventoryListQuery = {
        Page: 1,
        PageSize: 1000,
        OrderColumn: "ProductName",
        OrderDirection: "asc"
      };

      const res = await inventoryApi.list(query);

      const normalized = res.items.map((it) => ({
        ...it,
        productName: capitalizeFirst(it.productName ?? ""),
        sku: capitalizeFirst(it.sku ?? ""),
        category: capitalizeFirst(it.category ?? ""),
        location: capitalizeFirst(it.location ?? "")
      }));

      setItems(normalized);
    }

    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    let data = [...items];

    if (search.trim()) {
      const term = search.toLowerCase();

      data = data.filter(
        (x) =>
          x.productName?.toLowerCase().includes(term) ||
          x.sku?.toLowerCase().includes(term) ||
          x.category?.toLowerCase().includes(term) ||
          x.location?.toLowerCase().includes(term)
      );
    }// if there is a search term, we filter the items to only include those where the product name, SKU, category, or location includes the search term (case-insensitive). This allows the user to quickly find items by typing in any relevant keyword.

    if (category) data = data.filter((x) => x.category === category);

    if (status !== null) data = data.filter((x) => x.status === status);

    return data;
  }, [items, search, category, status]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));

  const pagedItems = filteredItems.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  function getQrValue(it: InventoryItem) {
    return `${window.location.origin}/inventory/${it.id}`;
  }

  async function handleCreate(payload: Omit<InventoryItemDTO, "Id">) {
    await inventoryApi.create(payload);
    setCreateOpen(false);
    reloadItems();
  }

  async function handleEdit(payload: Omit<InventoryItemDTO, "Id">) {
    if (!selected) return;

    await inventoryApi.update(selected.id, {
      Id: selected.id,
      ...payload
    });

    setEditOpen(false);
    reloadItems();
  }

  async function reloadItems() {
    const res = await inventoryApi.list({
      Page: 1,
      PageSize: 1000,
      OrderColumn: "ProductName",
      OrderDirection: "asc"
    });

    setItems(res.items);
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    await inventoryApi.remove(deleteItem.id);

    setDeleteOpen(false);
    setDeleteItem(null);

    reloadItems();
  }

  return (
    <Box>

      {/* HEADER */}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3
        }}
      >
        <Box>
          <Typography level="h1">Inventory</Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Manage your inventory items
          </Typography>
        </Box>

        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Add Product
        </Button>
      </Box>

      {/* FILTERS */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" },
          gap: 2,
          mb: 3
        }}
      >
        <Input
          startDecorator={<SearchRounded />}
          placeholder="Search inventory"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select value={status} placeholder="Status" onChange={(_, v) => setStatus(v)}>
          {statusOptions.map((s) => (
            <Option key={s.label} value={s.value}>
              {s.label}
            </Option>
          ))}
        </Select>

        <Select
          value={category}
          placeholder="Category"
          onChange={(_, v) => setCategory(v ?? "")}
        >
          {categoryOptions.map((c) => (
            <Option key={c || "ALL"} value={c}>
              {c || "All"}
            </Option>
          ))}
        </Select>
      </Box>

      {/* TABLE */}

      <Sheet variant="outlined" sx={{ borderRadius: "lg" }}>
        <Box sx={{ overflowX: "auto" }}>
          <Table hoverRow stickyHeader sx={{ minWidth: 850 }}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Qty</th>
                <th>Location</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {pagedItems.map((it) => {
                const chip = statusChip(it.status);

                return (
                  <tr key={it.id}>
                    <td>{it.productName}</td>
                    <td>{it.sku}</td>
                    <td>{it.category}</td>
                    <td>{it.quantity}</td>
                    <td>{it.location}</td>
                    <td>{money(it.unitPrice)}</td>

                    <td>
                      <Chip color={chip.color} size="sm" variant="soft">
                        {chip.label}
                      </Chip>
                    </td>

                    <td>
                      <InventoryRowMenu
                        onEdit={() => {
                          setSelected(it);
                          setEditOpen(true);
                        }}
                        onQr={() => {
                          setQrModalValue(getQrValue(it));
                          setQrModalOpen(true);
                        }}
                        onDelete={() => {
                          setDeleteItem(it);
                          setDeleteOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </Box>

        {/* PAGINATION */}

        <Box sx={{ display: "flex", justifyContent: "space-between", p: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>

          <Typography>
            Page {page} of {totalPages}
          </Typography>

          <Button disabled={page === totalPages} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </Box>
      </Sheet>

      {/* CREATE */}

      <InventoryItemDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitting={false}
      />

      {/* EDIT */}

      <InventoryItemDialog
        open={editOpen}
        mode="edit"
        initial={
          selected
            ? {
                Id: selected.id,
                ProductName: selected.productName,
                Sku: selected.sku,
                Category: selected.category,
                Quantity: selected.quantity,
                UnitPrice: selected.unitPrice,
                Location: selected.location,
                QrCodeValue: selected.qrCodeValue,
                Description: selected.description,
                ImageUrl: selected.imageUrl,
                Status: selected.status
              }
            : null
        }
        onClose={() => setEditOpen(false)}
        onSubmit={handleEdit}
        submitting={false}
      />

      {/* QR */}

      <InventoryQrModal
        open={qrModalOpen}
        value={qrModalValue}
        onClose={() => setQrModalOpen(false)}
      />

      {/* DELETE CONFIRMATION */}

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <ModalDialog variant="outlined">
          <DialogTitle>Delete Item</DialogTitle>

          <DialogContent>
            Are you sure you want to delete{" "}
            <strong>{deleteItem?.productName}</strong>?
          </DialogContent>

          <DialogActions>
            <Button variant="plain" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>

            <Button color="danger" onClick={confirmDelete}>
              Yes, Delete
            </Button>
          </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
}
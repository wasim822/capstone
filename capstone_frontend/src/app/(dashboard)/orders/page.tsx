// Orders page:
// coordinates order search, filtering, pagination, and the create-order workflow.
'use client';

import { Box, Typography, Button, FormControl, Input, FormLabel, Select, Option, Breadcrumbs, Link, Stack } from '@mui/joy';
import SearchIcon from '@mui/icons-material/Search';
import React, { useCallback, useState } from 'react';
import OrderTable from './components/OrderTable';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import { OrderDialog } from './components/OrderDialog';
import { ordersApi } from '@/services/api/orders/orders.api';
import { OrderStatusEnum, type UpsertOrderDTO } from '@/services/api/orders/orders.types';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { inventoryApi } from '@/services/api/inventory/inventory.api';
import { InventoryItemStatusEnum } from '@/services/api/inventory/inventory.types';

// Maps a quantity to the inventory status value expected by the backend.
function getInventoryStatus(quantity: number): number {
  if (quantity <= 0) return Number(InventoryItemStatusEnum.OutStock);
  if (quantity <= 5) return Number(InventoryItemStatusEnum.LowStock);
  return Number(InventoryItemStatusEnum.InStock);
}

export default function OrdersPage() {
  // Page-level state for filters, pagination, and create-order workflow.
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [statusFilter, setStatusFilter] = useState<'all' | '0' | '1' | '4' | '6'>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Total count comes from the table so the page can render pagination controls.
  const [total, setTotal] = useState(0);
  const handleTotalChange = useCallback((nextTotal: number) => {
    setTotal(nextTotal);
  }, []);

  // Creates an order and then decrements inventory for each selected item.
  async function handleCreate(payload: UpsertOrderDTO) {
    // Creating an order also decrements the selected inventory quantities.
    setSubmitting(true);
    try {
      await ordersApi.create(payload);

      if (payload.OrderItems?.length) {
        await Promise.all(
          payload.OrderItems.map(async (orderItem) => {
            const inventoryItemId = orderItem.InventoryItemId;
            if (!inventoryItemId) return;

            const currentItem = await inventoryApi.getById(inventoryItemId);
            const orderedQuantity = Number(orderItem.Quantity ?? 0);
            const nextQuantity = Math.max(0, currentItem.quantity - orderedQuantity);

            await inventoryApi.update(inventoryItemId, {
              Id: currentItem.id,
              ProductName: currentItem.productName,
              Description: currentItem.description || null,
              Quantity: nextQuantity,
              UnitPrice: currentItem.unitPrice,
              QrCodeValue: currentItem.qrCodeValue || null,
              ImageUrl: currentItem.imageUrl || null,
              Category: currentItem.category || null,
              Location: currentItem.location || null,
              Sku: currentItem.sku || null,
              Status: getInventoryStatus(nextQuantity),
            });
          }),
        );
      }

      setPage(1);
      setRefreshKey((k) => k + 1);
    } finally {
      setSubmitting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Renders reusable filter controls for the orders toolbar.
  const renderFilters = () => (
    <React.Fragment>
      <FormControl size="sm">
        {/* Status filter drives the backend order list query. */}
        <FormLabel>Status</FormLabel>
        <Select
          size="sm"
          placeholder="All"
          value={statusFilter}
          onChange={(_, value) => {
            const next = (value ?? 'all') as 'all' | '0' | '1' | '4' | '6';
            setStatusFilter(next);
            setPage(1);
          }}
          slotProps={{ button: { sx: { whiteSpace: 'nowrap' } } }}
        >
          <Option value="all">All</Option>
          <Option value={OrderStatusEnum.Pending}>Pending</Option>
          <Option value={OrderStatusEnum.Processing}>Processing</Option>
          <Option value={OrderStatusEnum.Cancelled}>Cancelled</Option>
          <Option value={OrderStatusEnum.Completed}>Completed</Option>

        </Select>
      </FormControl>
    </React.Fragment>
  );
  
  return (
    <React.Fragment> 
      <Box
      sx={{
        flex: 1,          
        minHeight: 0,     
        display: 'flex',
        flexDirection: 'column',
      }}
      >

        {/* Breadcrumbs keep the orders page aligned with the dashboard nav. */}

        <Breadcrumbs
          size="sm"
          aria-label="breadcrumbs"
          separator={<ChevronRightRoundedIcon fontSize="small" />}
          sx={{ pl: 0 }}
        >
              <Link
                underline="none"
                color="neutral"
                href="#some-link"
                aria-label="Home"
              >
                <HomeRoundedIcon />
              </Link>
              <Link
                underline="hover"
                color="neutral"
                href="/dashboard"
                sx={{ fontSize: 12, fontWeight: 500 }}
              >
                Dashboard
              </Link>
              <Typography color="primary" sx={{ fontWeight: 500, fontSize: 12 }}>
                Orders
              </Typography>
            </Breadcrumbs>
            
        {/* Header actions cover export and opening the create-order dialog. */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Typography level="h2">Orders</Typography>

          <Stack direction="row" spacing={1.5}>

            {/* Download PDF button (In Progress) */}

            {/* <Button variant="solid" color="primary">
              Download PDF
            </Button> */}

            <Button color="primary" variant="solid" onClick={() => setCreateOpen(true)}>
              + Add Order
            </Button>
          </Stack>
          
        </Box>
        

        {/* Search and filters feed the table component below. */}

        <Box
          className="SearchAndFilters-tabletUp"
          sx={{
            borderRadius: 'sm',
            py: 2,
            display: { xs: 'none', sm: 'flex' },
            flexWrap: 'wrap',
            gap: 1.5,
            '& > *': {
              minWidth: { xs: '120px', md: '160px' },
            },
          }}
        >
          
          <FormControl sx={{ flex: 1 }} size="sm">
            <FormLabel>Search for order</FormLabel>
            <Input
              size="sm"
              placeholder="Search by order ID or type"
              startDecorator={<SearchIcon />}
              value={search}
              onChange={(e) => {
                // Remove symbols (allow only letters, numbers and spaces), then enforce max length.
                const nextSearch = e.target.value
                  .replace(/[^a-zA-Z0-9\s]/g, '')
                  .slice(0, 50);
                setSearch(nextSearch);
                setPage(1);
              }}
              slotProps={{
                input: {
                  minLength: 1,
                  maxLength: 50,
                },
              }}
            />
          </FormControl>

          {renderFilters()}
        </Box>
        {/* The table owns fetching, row actions, and the view/edit dialogs. */}
        
          <OrderTable
            key={refreshKey}
            page={page}
            pageSize={pageSize}
            statusFilter={statusFilter}
            search={debouncedSearch}
            onTotalChange={handleTotalChange}
          />
      </Box>

      {/* Pagination controls are kept outside the table so page state stays page-level. */}
       <Box
          sx={{
            px: 2,
            py: 1.5,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="outlined"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>

          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            Page {page} of {totalPages}
          </Typography>

          <Button
            variant="outlined"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </Box>

      {/* The create dialog is mounted here so page state controls refreshes after saves. */}
       <OrderDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        submitting={submitting}
      />
    </React.Fragment>
  );
}

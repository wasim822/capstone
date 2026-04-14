"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  Grid,
  Table,
  Chip,
  Stack,
  Skeleton
} from "@mui/joy";

import { motion } from "framer-motion";

import {
  LineChart,
  Line,
  XAxis,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

// ── Chart primitives (our local shadcn-style wrapper) ────────────────────────
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { inventoryApi } from "@/services/api/inventory/inventory.api";
import { ordersApi } from "@/services/api/orders/orders.api";
import { InventoryItemStatusEnum } from "@/services/api/inventory/inventory.types";
import { useAuth } from "@/auth/AuthProvider";

const MotionCard = motion(Card);

const COLORS = [
  "#4f46e5",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
];

// ── Static config for the line chart ────────────────────────────────────────
// The line chart only has one series ("orders"), so its config is fixed.
const lineChartConfig: ChartConfig = {
  orders: {
    label: "Orders",
    color: "#4f46e5",
  },
};

interface ActivityItem { text: string }
interface ChartItem    { name: string; orders: number }
interface CategoryItem { name: string; value: number  }

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: "lg",
        transition: "0.2s",
        "&:hover": { transform: "translateY(-4px)", boxShadow: "lg" },
      }}
    >
      <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
        {title}
      </Typography>
      <Typography level="h2">{value}</Typography>
    </MotionCard>
  );
}

function statusChip(status: InventoryItemStatusEnum) {
  switch (status) {
    case InventoryItemStatusEnum.InStock:  return <Chip color="success">In Stock</Chip>;
    case InventoryItemStatusEnum.LowStock: return <Chip color="warning">Low Stock</Chip>;
    default:                               return <Chip color="danger">Out of Stock</Chip>;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.firstName ?? user?.name?.split(" ")[0] ?? "User";

  const [loading, setLoading]             = useState(true);
  const [inventoryCount, setInventoryCount] = useState(0);
  const [lowStockCount, setLowStockCount]   = useState(0);
  const [ordersToday, setOrdersToday]       = useState(0);
  const [recentOrders, setRecentOrders]     = useState<any[]>([]);
  const [lowStockItems, setLowStockItems]   = useState<any[]>([]);
  const [chartData, setChartData]           = useState<ChartItem[]>([]);
  const [categoryData, setCategoryData]     = useState<CategoryItem[]>([]);
  const [activityFeed, setActivityFeed]     = useState<ActivityItem[]>([]);

  // ── Pie chart config — built dynamically from API categories ─────────────
  const categoryChartConfig = React.useMemo<ChartConfig>(() => {
    const config: ChartConfig = {};
    categoryData.forEach((item, index) => {
      const key = item.name.toLowerCase().replace(/\s+/g, "_");
      config[key] = { label: item.name, color: COLORS[index % COLORS.length] };
    });
    return config;
  }, [categoryData]);

  // Add `fill` to each pie slice so ChartTooltipContent can read the colour
  const pieData = React.useMemo(
    () => categoryData.map((item, index) => ({
      ...item,
      fill: COLORS[index % COLORS.length],
    })),
    [categoryData]
  );

  // ── Data fetching ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadDashboard() {
      try {
        /* INVENTORY */
        const inventoryRes = await inventoryApi.list({ Page: 1, PageSize: 1000 });
        const items = inventoryRes.items;
        setInventoryCount(items.length);

        const lowStock = items.filter(
          (item) =>
            item.status === InventoryItemStatusEnum.LowStock ||
            item.status === InventoryItemStatusEnum.OutStock
        );
        setLowStockCount(lowStock.length);
        setLowStockItems(lowStock.slice(0, 5));

        /* CATEGORY DATA */
        const categoryMap: Record<string, number> = {};
        items.forEach((item) => {
          const category = item.category ?? "Other";
          categoryMap[category] = (categoryMap[category] ?? 0) + 1;
        });
        setCategoryData(
          Object.keys(categoryMap).map((key) => ({ name: key, value: categoryMap[key] }))
        );

        /* ORDERS */
        const ordersRes = await ordersApi.list({ Page: 1, PageSize: 20 });
        const orders = ordersRes.items;
        setRecentOrders(orders.slice(0, 5));

        const today = new Date().toDateString();
        setOrdersToday(
          orders.filter((o) => new Date(o.createdAt).toDateString() === today).length
        );

        /* ORDER CHART */
        setChartData(
          orders.slice(0, 7).map((order, index) => ({
            name: `Day ${index + 1}`,
            orders: order.totalItems ?? 1,
          }))
        );

        /* ACTIVITY FEED */
        setActivityFeed([
          ...orders.slice(0, 3).map((order) => ({ text: `Order #${order.id} created` })),
          ...lowStock.slice(0, 2).map((item) => ({ text: `${item.productName} low stock` })),
        ]);
      } catch (error) {
        console.error("Dashboard load failed", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Box>

      {/* HEADER */}
      <Box sx={{ mb: 3 }}>
        <Typography level="h2">Welcome, {firstName}</Typography>
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          Here is what's happening in your warehouse today.
        </Typography>
      </Box>

      {/* STAT CARDS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid xs={12} sm={6} md={4}>
          {loading ? <Skeleton height={90} /> : <StatCard title="Inventory Items" value={inventoryCount} />}
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          {loading ? <Skeleton height={90} /> : <StatCard title="Low Stock Items" value={lowStockCount} />}
        </Grid>
        <Grid xs={12} sm={6} md={4}>
          {loading ? <Skeleton height={90} /> : <StatCard title="Orders Today" value={ordersToday} />}
        </Grid>
      </Grid>

      {/* CHARTS */}
      <Grid container spacing={2} sx={{ mb: 3 }}>

        {/* ── Order Activity — Line chart via ChartContainer ─────────────── */}
        <Grid xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography level="title-md" sx={{ mb: 1 }}>Order Activity</Typography>

            {loading ? (
              <Skeleton height={250} />
            ) : (
              // ChartContainer handles ResponsiveContainer + CSS colour vars.
              // lineChartConfig tells ChartTooltipContent to label the series
              // "Orders" and colour the swatch #4f46e5.
              <ChartContainer
                config={lineChartConfig}
                style={{ height: 250, width: "100%" }}
              >
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  {/*
                    ChartTooltip replaces the plain Recharts <Tooltip />.
                    ChartTooltipContent reads the "orders" key from lineChartConfig
                    to display the branded label and colour swatch automatically.
                  */}
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="var(--color-orders)" // CSS var injected by ChartContainer
                    strokeWidth={3}
                    dot={{ r: 4, fill: "var(--color-orders)", strokeWidth: 0 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ChartContainer>
            )}
          </Card>
        </Grid>

        {/* ── Inventory Categories — Pie chart via ChartContainer ─────────── */}
        <Grid xs={12} md={6}>
          <Card sx={{ p: 2 }}>
            <Typography level="title-md" sx={{ mb: 1 }}>Inventory Categories</Typography>

            {loading ? (
              <Skeleton height={250} />
            ) : (
              <ChartContainer
                config={categoryChartConfig}
                style={{ height: 250, width: "100%" }}
              >
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    // innerRadius={50} — uncomment for a donut chart
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                </PieChart>
              </ChartContainer>
            )}
          </Card>
        </Grid>

      </Grid>

      {/* TABLES */}
      <Grid container spacing={2}>

        {/* LOW STOCK */}
        <Grid xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography level="title-md">Low Stock Alerts</Typography>
            <Table size="sm">
              <tbody>
                {lowStockItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{statusChip(item.status)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Grid>

        {/* RECENT ORDERS */}
        <Grid xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography level="title-md">Recent Orders</Typography>
            <Table size="sm">
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.id}</td>
                    <td>
                      <Chip size="sm">{order.status ?? "Pending"}</Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>
        </Grid>

        {/* ACTIVITY FEED */}
        <Grid xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography level="title-md">Activity Feed</Typography>
            <Stack spacing={1.2} sx={{ mt: 1 }}>
              {activityFeed.map((activity, index) => (
                <Typography key={index} level="body-sm">
                  • {activity.text}
                </Typography>
              ))}
            </Stack>
          </Card>
        </Grid>

      </Grid>

    </Box>
  );
}
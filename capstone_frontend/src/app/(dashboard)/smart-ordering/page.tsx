"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  Chip,
  Input,
  Option,
  Select,
  Sheet,
  Table,
  Typography,
} from "@mui/joy";
import SearchRounded from "@mui/icons-material/SearchRounded";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import { useAuth } from "@/auth/AuthProvider";
import { usePermissions } from "@/hooks/usePermissions";
import { getSmartOrderingRecommendations } from "@/services/api/smart-ordering/smartOrdering.api";
import type {
  SmartOrderingRow,
  StockoutRiskLevel,
} from "@/services/api/smart-ordering/smartOrdering.types";

function riskChipColor(
  risk: StockoutRiskLevel,
): "danger" | "warning" | "success" {
  if (risk === "high") return "danger";
  if (risk === "medium") return "warning";
  return "success";
}

function riskLabel(risk: StockoutRiskLevel) {
  return risk.charAt(0).toUpperCase() + risk.slice(1);
}

function stockLevelBarFill(risk: StockoutRiskLevel): string {
  if (risk === "high") return "var(--joy-palette-danger-500, #c41c1c)";
  if (risk === "medium") return "var(--joy-palette-warning-500, #9a5b13)";
  return "var(--joy-palette-success-500, #1f7a1f)";
}

function stockFillPercent(row: SmartOrderingRow): number {
  const stock = Number.isFinite(row.currentStock) ? row.currentStock : 0;
  const cap =
    Number.isFinite(row.maxCapacity) && row.maxCapacity > 0
      ? row.maxCapacity
      : Math.max(1, stock);
  return Math.min(100, Math.max(0, Math.round((stock / cap) * 100)));
}

export default function SmartOrderingPage() {
  const router = useRouter();
  const { role } = useAuth();
  const effectiveRole = role ?? "staff";
  const { has } = usePermissions(effectiveRole);

  const [rows, setRows] = useState<SmartOrderingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchGeneration = useRef(0);
  const inFlightAbortRef = useRef<AbortController | null>(null);

  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("30");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const timeframeRef = useRef(timeframe);
  timeframeRef.current = timeframe;

  useEffect(() => {
    if (role !== undefined && !has("ai.view")) {
      router.replace("/dashboard");
    }
  }, [role, has, router]);

  /** Changing the demand window invalidates in-flight work and clears the table until they generate again. */
  useEffect(() => {
    inFlightAbortRef.current?.abort();
    inFlightAbortRef.current = null;
    setRows([]);
    setLoadError(null);
    setLoading(false);
  }, [timeframe]);

  useEffect(() => {
    if (!has("ai.view")) {
      setRows([]);
      setLoadError(null);
      setLoading(false);
    }
  }, [has]);

  const blocking = role === undefined || loading;

  const runGeneration = useCallback(async () => {
    if (role === undefined || !has("ai.view")) return;

    inFlightAbortRef.current?.abort();
    const ac = new AbortController();
    inFlightAbortRef.current = ac;

    const gen = ++fetchGeneration.current;
    const snapshotTimeframe = timeframe;
    /** Inventory + optional many order calls + GitHub Models can exceed a few minutes. */
    const timeoutMs = 360_000;
    const timeoutId = window.setTimeout(() => ac.abort(), timeoutMs);

    setLoading(true);
    setLoadError(null);
    try {
      const days = Number(snapshotTimeframe) || 30;
      const data = await getSmartOrderingRecommendations(days, {
        signal: ac.signal,
      });
      if (
        gen !== fetchGeneration.current ||
        snapshotTimeframe !== timeframeRef.current
      ) {
        return;
      }
      setRows(data);
    } catch (e) {
      if (gen !== fetchGeneration.current) return;
      if (snapshotTimeframe !== timeframeRef.current) return;
      const isAbort =
        (e instanceof DOMException || e instanceof Error) &&
        e.name === "AbortError";
      if (isAbort) {
        setLoadError(
          "Request timed out after 6 minutes (order API round-trips + AI). Ensure Express is running and reachable from Next, set SMART_ORDERING_SKIP_ORDER_LINE_FETCH=true on the server if order lines are slow, or try again.",
        );
        setRows([]);
        return;
      }
      setLoadError(
        e instanceof Error ? e.message : "Could not load recommendations.",
      );
      setRows([]);
    } finally {
      window.clearTimeout(timeoutId);
      if (inFlightAbortRef.current === ac) {
        inFlightAbortRef.current = null;
      }
      if (
        gen === fetchGeneration.current &&
        snapshotTimeframe === timeframeRef.current
      ) {
        setLoading(false);
      }
    }
  }, [role, has, timeframe]);

  const categories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (riskFilter !== "all" && r.stockoutRisk !== riskFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter)
        return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q)
      );
    });
  }, [rows, search, riskFilter, categoryFilter]);

  if (role !== undefined && !has("ai.view")) {
    return null;
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Page header — same pattern as People / Departments */}
      <Box
        sx={{
          mb: 3,
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography level="h1" sx={{ fontSize: "2.5rem", fontWeight: 700 }}>
            AI reorder recommendations
          </Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary", mt: 0.5 }}>
            Transparent recommendations with urgency, confidence, and reasoning
            surfaced directly in each row.
          </Typography>
        </Box>

        <Button
          color="primary"
          variant="solid"
          startDecorator={<AutoAwesomeRounded />}
          loading={loading}
          disabled={role === undefined || !has("ai.view")}
          onClick={() => void runGeneration()}
          sx={{ mt: { xs: 1, md: 0 }, flexShrink: 0 }}
        >
          Generate
        </Button>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
          alignItems: "flex-end",
        }}
      >
        <Input
          placeholder="Search by item name, SKU, or category"
          startDecorator={<SearchRounded />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: "1 1 240px", minWidth: 200 }}
        />
        <Select
          size="md"
          value={timeframe}
          onChange={(_, v) => v != null && setTimeframe(v)}
          startDecorator={<FilterListRounded />}
          sx={{ minWidth: 160 }}
        >
          <Option value="14">Last 14 days (order history)</Option>
          <Option value="30">Last 30 days (order history)</Option>
          <Option value="90">Last 90 days (order history)</Option>
        </Select>
        <Select
          size="md"
          value={riskFilter}
          onChange={(_, v) => v != null && setRiskFilter(v)}
          startDecorator={<FilterListRounded />}
          sx={{ minWidth: 140 }}
        >
          <Option value="all">All risk</Option>
          <Option value="high">High</Option>
          <Option value="medium">Medium</Option>
          <Option value="low">Low</Option>
        </Select>
        <Select
          size="md"
          value={categoryFilter}
          onChange={(_, v) => v != null && setCategoryFilter(v)}
          startDecorator={<FilterListRounded />}
          sx={{ minWidth: 180 }}
        >
          {categories.map((c) => (
            <Option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </Option>
          ))}
        </Select>
      </Box>

      {loadError && (
        <Typography level="body-sm" color="danger" sx={{ mb: 2 }}>
          {loadError}
        </Typography>
      )}

      <Sheet variant="outlined" sx={{ borderRadius: "lg", overflow: "hidden" }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography level="body-sm">
            {blocking
              ? "Loading recommendations…"
              : rows.length === 0
                ? "No recommendations loaded yet."
                : `Showing ${filtered.length} recommendation(s)`}
          </Typography>
        </Box>

        <Box sx={{ overflowX: "auto" }}>
          <Table
            hoverRow
            sx={{
              minWidth: 1080,
              "& thead th": { fontWeight: 700, whiteSpace: "nowrap" },
            }}
          >
            <thead>
              <tr>
                <th style={{ width: "22%" }}>Item</th>
                <th style={{ width: "14%" }}>Current stock</th>
                <th style={{ width: "14%" }}>AI recommended qty</th>
                <th style={{ width: "22%" }}>AI reasoning</th>
                <th style={{ width: "10%" }}>Stockout risk</th>
                <th style={{ width: "12%" }}>Confidence score</th>
              </tr>
            </thead>
            <tbody>
              {blocking ? (
                <tr>
                  <td colSpan={6}>
                    <Box sx={{ py: 6, textAlign: "center" }}>
                      <Typography level="body-sm" color="neutral">
                        Loading…
                      </Typography>
                    </Box>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Box sx={{ py: 6, textAlign: "center", px: 2 }}>
                      <Typography level="body-sm" color="neutral">
                        {rows.length === 0 && !loadError
                          ? "Pick a timeframe above, then click Generate to load AI recommendations. If you change the time window, click Generate again."
                          : rows.length === 0 && loadError
                            ? "Fix the issue above and try Generate again."
                            : "No rows match your filters."}
                      </Typography>
                    </Box>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => {
                  const pct = stockFillPercent(r);
                  return (
                    <tr key={r.id}>
                      <td>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            size="sm"
                            src={r.imageUrl ?? undefined}
                            alt=""
                            sx={{
                              bgcolor: "neutral.softBg",
                              color: "neutral.softColor",
                              fontWeight: 600,
                              "html[data-joy-color-scheme='dark'] &": {
                                bgcolor: "rgba(255, 255, 255, 0.12)",
                                border: "1px solid rgba(255, 255, 255, 0.24)",
                                color: "var(--joy-palette-neutral-100, #f4f4f5)",
                              },
                            }}
                          >
                            {r.name.charAt(0)}
                          </Avatar>
                          <Box sx={{ minWidth: 0 }}>
                            <Typography level="body-sm" fontWeight={600} noWrap>
                              {r.name}
                            </Typography>
                            <Typography level="body-xs" color="neutral">
                              {r.sku}
                            </Typography>
                          </Box>
                        </Box>
                      </td>
                      <td>
                        <Typography level="body-sm" fontWeight={600}>
                          {r.currentStock} units / {r.maxCapacity}
                        </Typography>
                        <Box
                          sx={{
                            mt: 0.75,
                            height: 8,
                            borderRadius: "sm",
                            bgcolor: "var(--joy-palette-neutral-200, #e4e4e7)",
                            overflow: "hidden",
                          }}
                          title={`${pct}% of estimated max capacity`}
                        >
                          <Box
                            sx={{
                              height: "100%",
                              width: `${pct}%`,
                              bgcolor: stockLevelBarFill(r.stockoutRisk),
                              transition: "width 0.2s ease",
                            }}
                          />
                        </Box>
                      </td>
                      <td>
                        <Typography
                          level="body-sm"
                          fontWeight={700}
                          sx={{ color: "primary.500" }}
                        >
                          +{r.recommendedQty} units
                        </Typography>
                        <Typography
                          level="body-xs"
                          sx={{ color: "text.tertiary", mt: 0.25 }}
                        >
                          {r.recommendationNote}
                        </Typography>
                      </td>
                      <td>
                        <Typography
                          level="body-sm"
                          sx={{
                            color: "text.secondary",
                            display: "-webkit-box",
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {r.reasoning}
                        </Typography>
                      </td>
                      <td>
                        <Chip
                          size="sm"
                          variant="soft"
                          color={riskChipColor(r.stockoutRisk)}
                          sx={{
                            minWidth: 88,
                            px: 0.5,
                            display: "inline-flex",
                            justifyContent: "center",
                            "& .MuiChip-label": { textAlign: "center", width: "100%" },
                          }}
                        >
                          {riskLabel(r.stockoutRisk)}
                        </Chip>
                      </td>
                      <td>
                        <Typography level="body-sm" fontWeight={700}>
                          {r.confidencePercent}%
                        </Typography>
                        <Typography
                          level="body-xs"
                          sx={{ color: "primary.500", mt: 0.25 }}
                        >
                          {r.confidenceLabel}
                        </Typography>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </Box>
      </Sheet>
    </Box>
  );
}

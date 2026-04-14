"use client";



import * as React from "react";
import * as RechartsPrimitive from "recharts";



export type ChartConfig = Record<
  string,
  { label: string; color?: string; icon?: React.ComponentType }
>;



type ChartContextValue = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart(): ChartContextValue {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used inside <ChartContainer>.");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART CONTAINER
// ─────────────────────────────────────────────────────────────────────────────

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<
      typeof RechartsPrimitive.ResponsiveContainer
    >["children"];
  }
>(({ id, className, children, config, style, ...props }, ref) => {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  // Inject each colour as a CSS custom property so tooltip/legend can read it
  const cssVars = React.useMemo(() => {
    const vars: Record<string, string> = {};
    Object.entries(config).forEach(([key, value]) => {
      if (value.color) vars[`--color-${key}`] = value.color;
    });
    return vars;
  }, [config]);

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        ref={ref}
        className={className}
        style={{
          display: "flex",
          justifyContent: "center",
          fontSize: "0.75rem",
          ...cssVars,
          ...style,
        }}
        {...props}
      >
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";



const ChartTooltip = RechartsPrimitive.Tooltip;

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
    React.ComponentProps<"div"> & {
      hideLabel?: boolean;
      hideIndicator?: boolean;
      indicator?: "line" | "dot" | "dashed";
      nameKey?: string;
      labelKey?: string;
    }
>(
  (
    {
      active,
      payload,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
      style,
    },
    ref
  ) => {
    const { config } = useChart();

    const tooltipLabel = React.useMemo(() => {
      if (hideLabel || !payload?.length) return null;
      const [item] = payload;
      const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
      const itemConfig = getPayloadConfigFromPayload(config, item, key);
      const value =
        !labelKey && typeof label === "string"
          ? config[label as keyof typeof config]?.label ?? label
          : itemConfig?.label;

      if (labelFormatter) {
        return (
          <div style={{ fontWeight: 600 }} className={labelClassName}>
            {labelFormatter(value, payload)}
          </div>
        );
      }
      if (!value) return null;
      return (
        <div style={{ fontWeight: 600 }} className={labelClassName}>
          {value}
        </div>
      );
    }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

    if (!active || !payload?.length) return null;

    const nestLabel = payload.length === 1 && indicator !== "dot";

    return (
      <div
        ref={ref}
        style={{
          display: "grid",
          minWidth: 128,
          gap: 6,
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "#fff",
          padding: "6px 10px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          fontSize: "0.75rem",
          ...style,
        }}
      >
        {!nestLabel ? tooltipLabel : null}
        <div style={{ display: "grid", gap: 6 }}>
          {payload.map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor =
              color ??
              ((item.payload as Record<string, unknown>)?.fill as string) ??
              item.color;

            return (
              <div
                key={String(item.dataKey)}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          style={{
                            width: indicator === "dot" ? 10 : indicator === "line" ? 4 : 0,
                            height: 10,
                            borderRadius: 2,
                            flexShrink: 0,
                            backgroundColor:
                              indicator === "dashed" ? "transparent" : indicatorColor,
                            border:
                              indicator === "dashed"
                                ? `1.5px dashed ${indicatorColor}`
                                : undefined,
                          }}
                        />
                      )
                    )}
                    <div
                      style={{
                        display: "flex",
                        flex: 1,
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ color: "rgba(0,0,0,0.55)" }}>
                        {itemConfig?.label ?? item.name}
                      </span>
                      {item.value !== undefined && (
                        <span style={{ fontWeight: 600 }}>
                          {Number(item.value).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);
ChartTooltipContent.displayName = "ChartTooltipContent";



const ChartLegend = RechartsPrimitive.Legend;

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> &
    Pick<RechartsPrimitive.LegendProps, "payload" | "verticalAlign"> & {
      hideIcon?: boolean;
      nameKey?: string;
    }
>(({ hideIcon = false, payload, verticalAlign = "bottom", nameKey, style }, ref) => {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        gap: 16,
        paddingTop: verticalAlign === "top" ? 0 : 12,
        paddingBottom: verticalAlign === "top" ? 12 : 0,
        ...style,
      }}
    >
      {payload.map((item) => {
        const key = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = getPayloadConfigFromPayload(config, item, key);

        return (
          <div
            key={String(item.value)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  flexShrink: 0,
                  backgroundColor: item.color,
                }}
              />
            )}
            <span style={{ fontSize: "0.75rem" }}>
              {itemConfig?.label ?? String(item.value)}
            </span>
          </div>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";



function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) return undefined;

  const payloadPayload =
    "payload" in payload &&
    typeof (payload as Record<string, unknown>).payload === "object" &&
    (payload as Record<string, unknown>).payload !== null
      ? (payload as Record<string, unknown>).payload
      : undefined;

  let configLabelKey: string = key;

  if (key in config) {
    configLabelKey = key;
  } else if (
    payloadPayload &&
    key in (payloadPayload as Record<string, unknown>) &&
    typeof (payloadPayload as Record<string, unknown>)[key] === "string" &&
    ((payloadPayload as Record<string, unknown>)[key] as string) in config
  ) {
    configLabelKey = (payloadPayload as Record<string, unknown>)[key] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : undefined;
}



export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
};
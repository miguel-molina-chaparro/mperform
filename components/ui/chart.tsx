"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";

import { cn } from "@/lib/utils";

export type ChartConfig = {
  [key: string]: {
    label?: string;
    color?: string;
  };
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) throw new Error("useChart must be used within a ChartContainer");
  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
}) {
  const autoId = React.useId();
  const chartId = `chart-${id || autoId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className,
        )}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: Object.entries(config)
              .map(([key, item]) =>
                item.color ? `[data-chart=${chartId}] { --color-${key}: ${item.color}; }` : "",
              )
              .join("\n"),
          }}
        />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string }>;
  label?: string | number;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-background p-2 shadow-sm">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="grid gap-1">
        {payload.map((entry) => {
          const key = String(entry.dataKey ?? "");
          return (
            <div key={key} className="flex items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                {config[key]?.label ?? key}
              </span>
              <span className="font-medium">{Number(entry.value).toFixed(2)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  payload,
}: {
  payload?: Array<{ dataKey?: string | number; color?: string }>;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 pt-2">
      {payload.map((entry) => {
        const key = String(entry.dataKey ?? "");
        return (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: entry.color || `var(--color-${key})` }}
            />
            <span>{config[key]?.label ?? key}</span>
          </div>
        );
      })}
    </div>
  );
}

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
};

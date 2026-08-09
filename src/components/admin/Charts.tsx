"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/utils";

/**
 * Chart palette — validated against the white admin surface: lightness band,
 * chroma floor, CVD separation, normal-vision floor and contrast all pass.
 *
 * Worst adjacent CVD separation is ΔE 27.4 (tritan), comfortably above the
 * target of 8. The previous teal/red pair passed at ΔE 11.0 deutan — legal,
 * but close enough to the floor that a red/green viewer had little margin.
 * Violet against red separates on lightness as well as hue, which is what
 * survives the simulation. Do not swap these hexes without re-validating.
 */
const SERIES = "#7c3aed"; // brand violet — primary/completed
const DANGER = "#d03b3b"; // status critical — cancelled
const GRID = "#e2e8f0";
const AXIS = "#64748b";
const SURFACE = "#ffffff";

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: AXIS, fontSize: 11 },
} as const;

function compactCurrency(value: number) {
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}K`;
  return `₹${value}`;
}

function TooltipBox({
  label,
  rows,
}: {
  label?: string;
  rows: { name: string; value: string; color: string }[];
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-slate-900">{label}</p>
      <ul className="mt-1.5 space-y-1">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.color }}
              aria-hidden="true"
            />
            <span className="text-slate-600">{row.name}</span>
            <span className="ml-auto font-medium tabular-nums text-slate-900">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface MonthlyPoint {
  month: string;
  revenue: number;
  orders: number;
  completed: number;
  cancelled: number;
  itemsSold: number;
  avgOrderValue: number;
  revenueGrowth: number | null;
}

const METRICS = [
  { key: "revenue", label: "Revenue", currency: true },
  { key: "orders", label: "Orders", currency: false },
  { key: "itemsSold", label: "Items Sold", currency: false },
] as const;

type MetricKey = (typeof METRICS)[number]["key"];

/**
 * One measure at a time, switched by the reader. Deliberately NOT a dual-axis
 * chart: revenue and unit counts live on incompatible scales, and overlaying
 * them invents a correlation the data does not contain.
 */
export function MetricChart({ data }: { data: MonthlyPoint[] }) {
  const [metric, setMetric] = useState<MetricKey>("revenue");
  const active = METRICS.find((m) => m.key === metric)!;
  const format = (v: number) =>
    active.currency ? formatCurrency(v, { decimals: false }) : formatNumber(v);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Chart measure">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            aria-pressed={metric === m.key}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              metric === m.key
                ? "bg-brand-700 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
            <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" />
            <YAxis
              {...axisProps}
              width={56}
              tickFormatter={(v) => (active.currency ? compactCurrency(Number(v)) : String(v))}
            />
            <Tooltip
              cursor={{ stroke: GRID, strokeWidth: 1 }}
              content={({ active: on, payload, label }) =>
                on && payload?.length ? (
                  <TooltipBox
                    label={String(label)}
                    rows={[
                      {
                        name: active.label,
                        value: format(Number(payload[0].value)),
                        color: SERIES,
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={SERIES}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              fill={SERIES}
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Revenue over the rolling 12 months. One series, so no legend box. */
export function RevenueChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
          <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} width={56} tickFormatter={compactCurrency} />
          <Tooltip
            cursor={{ stroke: GRID, strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={String(label)}
                  rows={[
                    {
                      name: "Revenue",
                      value: formatCurrency(Number(payload[0].value), { decimals: false }),
                      color: SERIES,
                    },
                  ]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke={SERIES}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            fill={SERIES}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 4, fill: SERIES, stroke: SURFACE, strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Completed vs cancelled orders per month. Two series → legend is required. */
export function OrdersChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }} barGap={2}>
          <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
          <XAxis dataKey="month" {...axisProps} interval="preserveStartEnd" />
          <YAxis {...axisProps} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(15,23,42,0.04)" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  label={String(label)}
                  rows={payload.map((p) => ({
                    name: String(p.name),
                    value: formatNumber(Number(p.value)),
                    color: String(p.color),
                  }))}
                />
              ) : null
            }
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
          <Bar
            dataKey="completed"
            name="Completed"
            fill={SERIES}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="cancelled"
            name="Cancelled"
            fill={DANGER}
            maxBarSize={24}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Table-view twin. Every chart ships one so no value is reachable only by
 * hovering a mark.
 */
export function MonthlyTable({ data }: { data: MonthlyPoint[] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-900">
        Show data table
      </summary>
      <div className="table-scroll mt-3">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="py-2 text-left font-medium">Month</th>
              <th className="py-2 text-right font-medium">Revenue</th>
              <th className="py-2 text-right font-medium">Orders</th>
              <th className="py-2 text-right font-medium">Items</th>
              <th className="py-2 text-right font-medium">AOV</th>
              <th className="py-2 text-right font-medium">Growth</th>
              <th className="py-2 text-right font-medium">Cancelled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr key={row.month}>
                <td className="py-2 text-slate-700">{row.month}</td>
                <td className="py-2 text-right font-medium tabular-nums text-slate-900">
                  {formatCurrency(row.revenue, { decimals: false })}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-700">{row.orders}</td>
                <td className="py-2 text-right tabular-nums text-slate-700">{row.itemsSold}</td>
                <td className="py-2 text-right tabular-nums text-slate-700">
                  {formatCurrency(row.avgOrderValue, { decimals: false })}
                </td>
                <td className="py-2 text-right tabular-nums">
                  {row.revenueGrowth === null ? (
                    <span className="text-slate-400">N/A</span>
                  ) : (
                    <span className={row.revenueGrowth >= 0 ? "text-emerald-700" : "text-red-600"}>
                      {row.revenueGrowth >= 0 ? "+" : ""}
                      {row.revenueGrowth.toFixed(1)}%
                    </span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums text-slate-700">{row.cancelled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

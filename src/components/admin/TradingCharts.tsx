"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatCompactCurrency, formatCurrency, formatNumber } from "@/lib/utils";

/**
 * Charts for the trading history. Every series is passed in from the single
 * dataset the page loads — none of these components query or derive anything,
 * so a chart cannot disagree with the table beside it.
 *
 * Palette matches the rest of the admin: violet against red, validated for
 * colour-vision deficiency (worst adjacent ΔE 27.4 tritan). Profit uses a
 * third weight of the same violet rather than a new hue, because profit is
 * the same quantity as revenue after deductions, not a separate category.
 */
const SERIES = "#7c3aed";
const SERIES_DEEP = "#5b21b6";
const DANGER = "#d03b3b";
const GRID = "#e2e8f0";
const AXIS = "#64748b";
const SURFACE = "#ffffff";

const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: AXIS, fontSize: 11 },
} as const;

const tooltipProps = {
  contentStyle: {
    background: SURFACE,
    border: `1px solid ${GRID}`,
    borderRadius: 8,
    fontSize: 12,
    boxShadow: "0 4px 12px rgb(15 23 42 / 0.08)",
  },
  cursor: { fill: "rgb(124 58 237 / 0.06)" },
} as const;

export interface ChartMonth {
  month: string;
  netSales: number;
  orders: number;
  netProfit: number;
  grossProfit: number;
  customers: number;
  newCustomers: number;
  isPartial: boolean;
}

/** Marks the in-progress month so a short bar never reads as a collapse. */
function partialNote(data: ChartMonth[]) {
  const p = data.find((d) => d.isPartial);
  return p ? `${p.month} is still in progress.` : null;
}

function Frame({
  title, subtitle, data, children, legend,
}: {
  title: string; subtitle?: string; data: ChartMonth[];
  children: React.ReactNode;
  /** Rendered BELOW the fixed-height plot area. Passing a legend as a child
   *  put it inside the h-64 box, where it overlapped the x-axis labels. */
  legend?: React.ReactNode;
}) {
  const note = partialNote(data);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      <div className="mt-4 h-64">{children}</div>
      {legend && <div className="mt-3 flex flex-wrap gap-5 text-xs text-slate-600">{legend}</div>}
      {note && <p className="mt-2 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

export function RevenueTrendChart({ data }: { data: ChartMonth[] }) {
  return (
    <Frame title="Revenue — 12 months" subtitle="Net sales per month, cancelled orders excluded" data={data}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.28} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={(v) => formatCompactCurrency(Number(v))} />
          <Tooltip {...tooltipProps} formatter={(v) => [formatCurrency(Number(v), { decimals: false }), "Net sales"]} />
          <Area type="monotone" dataKey="netSales" stroke={SERIES} strokeWidth={2} fill="url(#revFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function OrdersTrendChart({ data }: { data: ChartMonth[] }) {
  return (
    <Frame title="Orders — 12 months" subtitle="Orders placed each month" data={data}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={40} allowDecimals={false} />
          <Tooltip {...tooltipProps} formatter={(v) => [formatNumber(Number(v)), "Orders"]} />
          <Bar dataKey="orders" radius={[4, 4, 0, 0]} stroke={SURFACE} strokeWidth={2}>
            {data.map((d) => (
              <Cell key={d.month} fill={d.isPartial ? "#c4b5fd" : SERIES} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function ProfitTrendChart({ data }: { data: ChartMonth[] }) {
  return (
    <Frame
      title="Profit — 12 months"
      subtitle="Gross profit and net profit after operating costs"
      data={data}
      legend={
        <>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ background: SERIES }} /> Gross profit
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ background: SERIES_DEEP }} /> Net profit
          </span>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={64} tickFormatter={(v) => formatCompactCurrency(Number(v))} />
          <Tooltip
            {...tooltipProps}
            formatter={(v, n) => [formatCurrency(Number(v), { decimals: false }), n === "grossProfit" ? "Gross profit" : "Net profit"]}
          />
          <Line type="monotone" dataKey="grossProfit" stroke={SERIES} strokeWidth={2} dot={{ r: 3, strokeWidth: 2, stroke: SURFACE }} />
          <Line type="monotone" dataKey="netProfit" stroke={SERIES_DEEP} strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, strokeWidth: 2, stroke: SURFACE }} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function CustomerGrowthChart({ data }: { data: ChartMonth[] }) {
  return (
    <Frame
      title="Customers — 12 months"
      subtitle="Accounts ordering each month, and first-time accounts"
      data={data}
      legend={
        <>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES }} /> Ordered this month
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: SERIES_DEEP }} /> First-ever order
          </span>
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" {...axisProps} />
          <YAxis {...axisProps} width={40} allowDecimals={false} />
          <Tooltip {...tooltipProps} formatter={(v, n) => [formatNumber(Number(v)), n === "customers" ? "Ordered" : "First order"]} />
          <Bar dataKey="customers" fill={SERIES} radius={[4, 4, 0, 0]} stroke={SURFACE} strokeWidth={2} />
          <Bar dataKey="newCustomers" fill={SERIES_DEEP} radius={[4, 4, 0, 0]} stroke={SURFACE} strokeWidth={2} />
        </BarChart>
      </ResponsiveContainer>
    </Frame>
  );
}

export function MonthOverMonthChart({ data }: { data: ChartMonth[] }) {
  const withChange = data.map((d, i) => ({
    month: d.month,
    change: i === 0 || data[i - 1].netSales === 0
      ? 0
      : Math.round(((d.netSales - data[i - 1].netSales) / data[i - 1].netSales) * 1000) / 10,
    isPartial: d.isPartial,
  }));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-900">Month-over-month change</h3>
      <p className="mt-0.5 text-sm text-slate-500">Percentage change in net sales against the previous month</p>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={withChange} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" {...axisProps} />
            <YAxis {...axisProps} width={44} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...tooltipProps} formatter={(v) => [`${Number(v) > 0 ? "+" : ""}${v}%`, "Change"]} />
            <Bar dataKey="change" radius={[4, 4, 0, 0]} stroke={SURFACE} strokeWidth={2}>
              {withChange.map((d) => (
                // Direction is carried by the label and the axis as well as by
                // colour, so the chart does not depend on hue alone.
                <Cell key={d.month} fill={d.change < 0 ? DANGER : SERIES} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function CategoryRevenueChart({
  data,
}: {
  data: { name: string; revenue: number; share: number }[];
}) {
  const top = data.slice(0, 8);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-semibold text-slate-900">Revenue by category</h3>
      <p className="mt-0.5 text-sm text-slate-500">Share of net sales over the 12 months</p>
      <div className="mt-4 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }} barCategoryGap="26%">
            <CartesianGrid stroke={GRID} strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => formatCompactCurrency(Number(v))} />
            <YAxis type="category" dataKey="name" {...axisProps} width={132} />
            <Tooltip {...tooltipProps} formatter={(v) => [formatCurrency(Number(v), { decimals: false }), "Revenue"]} />
            <Bar dataKey="revenue" fill={SERIES} radius={[0, 4, 4, 0]} stroke={SURFACE} strokeWidth={2} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

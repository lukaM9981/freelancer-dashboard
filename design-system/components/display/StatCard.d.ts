import * as React from "react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** The big number, e.g. "247%". Rendered in Satoshi Black. */
  value: string;
  /** Supporting caption, e.g. "Conversion increase". */
  label: string;
  /** Optional trend line, e.g. "vs. previous quarter". */
  trend?: string;
  trendDirection?: "up" | "down";
  variant?: "default" | "inverse";
}

/**
 * Data-forward stat card — oversized Satoshi-Black number with a caption and
 * optional trend indicator.
 *
 * @startingPoint section="Display" subtitle="Big-number stat card" viewport="360x180"
 */
export function StatCard(props: StatCardProps): JSX.Element;

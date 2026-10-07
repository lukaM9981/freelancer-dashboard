import React from "react";

/** Olifant Digital — StatCard. Big Satoshi-Black number + caption. Data-forward. */
export function StatCard({ value, label, trend, trendDirection = "up", variant = "default", style = {}, ...rest }) {
  const inverse = variant === "inverse";
  return (
    <div style={{
      borderRadius: "var(--radius-lg)", padding: "24px", boxSizing: "border-box",
      background: inverse ? "var(--background-inverse)" : "var(--background-raised)",
      boxShadow: inverse ? "none" : "inset 0 0 0 1px var(--border-subtle)",
      display: "flex", flexDirection: "column", gap: "8px", ...style,
    }} {...rest}>
      <span style={{
        fontFamily: "var(--font-sans)", fontWeight: "var(--weight-black)",
        fontSize: "48px", lineHeight: "1", letterSpacing: "-0.02em",
        color: inverse ? "var(--text-inverse)" : "var(--text-primary)",
      }}>{value}</span>
      <span style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: inverse ? "var(--neutral-300)" : "var(--text-secondary)" }}>{label}</span>
      {trend && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", marginTop: "4px", color: trendDirection === "down" ? "var(--error-fg)" : "var(--success-fg)" }}>
          <i data-lucide={trendDirection === "down" ? "trending-down" : "trending-up"} style={{ width: 16, height: 16 }}></i>{trend}
        </span>
      )}
    </div>
  );
}

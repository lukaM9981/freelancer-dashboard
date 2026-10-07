import React from "react";

/** Olifant Digital — Badge. Pill status label. variants match semantic colors. */
export function Badge({ variant = "default", size = "md", style = {}, children, ...rest }) {
  const variants = {
    default: { background: "var(--neutral-100)", color: "var(--text-secondary)" },
    brand:   { background: "var(--yellow-100)", color: "var(--yellow-800)" },
    success: { background: "var(--success-bg)", color: "var(--success-fg)" },
    error:   { background: "var(--error-bg)", color: "var(--error-fg)" },
    info:    { background: "var(--info-bg)", color: "var(--info-fg)" },
    accent:  { background: "var(--pine-100)", color: "var(--pine-700)" },
  };
  const sizes = {
    sm: { padding: "2px 8px", fontSize: "12px", lineHeight: "16px" },
    md: { padding: "4px 12px", fontSize: "13px", lineHeight: "18px" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "5px",
      borderRadius: "var(--radius-full)", fontFamily: "var(--font-sans)", fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap", ...sizes[size], ...variants[variant], ...style,
    }} {...rest}>{children}</span>
  );
}

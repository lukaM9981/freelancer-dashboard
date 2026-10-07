import React from "react";

/** Olifant Digital — Tag. Outlined/soft chip, optionally removable. */
export function Tag({ removable = false, onRemove, variant = "default", style = {}, children, ...rest }) {
  const variants = {
    default: { background: "var(--white)", color: "var(--text-primary)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" },
    brand: { background: "var(--yellow-50)", color: "var(--yellow-800)", boxShadow: "inset 0 0 0 1px var(--yellow-300)" },
    accent: { background: "var(--pine-50)", color: "var(--pine-700)", boxShadow: "inset 0 0 0 1px var(--pine-200)" },
  };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px", padding: removable ? "4px 6px 4px 12px" : "4px 12px",
      borderRadius: "var(--radius-full)", fontFamily: "var(--font-sans)", fontSize: "14px", fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap", ...variants[variant], ...style,
    }} {...rest}>
      {children}
      {removable && (
        <button type="button" onClick={onRemove} aria-label="Remove" style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18,
          border: "none", background: "transparent", cursor: "pointer", color: "inherit", opacity: 0.6, borderRadius: "var(--radius-full)",
        }}><i data-lucide="x" style={{ width: 14, height: 14 }}></i></button>
      )}
    </span>
  );
}

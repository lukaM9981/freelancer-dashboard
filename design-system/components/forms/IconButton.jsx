import React from "react";

/** Olifant Digital — IconButton. Square/circular icon-only action. */
export function IconButton({
  variant = "tertiary",
  size = "md",
  shape = "circle",
  disabled = false,
  label,
  children,
  style = {},
  ...rest
}) {
  const dims = { sm: 32, md: 40, lg: 48 }[size];
  const variants = {
    primary: { background: "var(--yellow-400)", color: "var(--neutral-900)", boxShadow: "none" },
    secondary: { background: "var(--neutral-900)", color: "var(--neutral-50)", boxShadow: "none" },
    tertiary: { background: "transparent", color: "var(--text-primary)", boxShadow: "inset 0 0 0 1.5px var(--border-strong)" },
    ghost: { background: "transparent", color: "var(--text-primary)", boxShadow: "none" },
  };
  const v = variants[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled && (variant === "tertiary" || variant === "ghost")) e.currentTarget.style.background = "var(--neutral-100)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = v.background; }}
      style={{
        width: dims, height: dims,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        border: "none", cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-sm)",
        transition: "background-color 150ms ease, transform 120ms ease",
        ...v, ...style,
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "scale(0.94)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      {...rest}
    >
      {children}
    </button>
  );
}

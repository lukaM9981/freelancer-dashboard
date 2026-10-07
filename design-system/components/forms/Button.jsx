import React from "react";

/**
 * Olifant Digital — Button
 * Pill-shaped, serif (Wulkan) label. Primary inverts yellow→ink on hover.
 */
export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  fullWidth = false,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: { padding: "8px 20px", fontSize: "16px", lineHeight: "20px", gap: "6px" },
    md: { padding: "12px 28px", fontSize: "18px", lineHeight: "22px", gap: "8px" },
    lg: { padding: "16px 32px", fontSize: "22px", lineHeight: "26px", gap: "10px" },
  };
  const isTertiary = variant === "tertiary";

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: fullWidth ? "100%" : "auto",
    border: "none",
    borderRadius: "var(--radius-full)",
    fontFamily: isTertiary ? "var(--font-sans)" : "var(--font-serif)",
    fontWeight: isTertiary ? "var(--weight-bold)" : "var(--weight-bold)",
    textTransform: isTertiary ? "uppercase" : "none",
    letterSpacing: isTertiary ? "var(--tracking-wide)" : "var(--tracking-tight)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: "background-color 150ms cubic-bezier(0.2,0,0,1), color 150ms cubic-bezier(0.2,0,0,1), transform 120ms ease, box-shadow 150ms ease",
    whiteSpace: "nowrap",
    outline: "none",
    ...sizes[size],
    ...(isTertiary ? { fontSize: size === "lg" ? "16px" : size === "sm" ? "13px" : "14px" } : {}),
  };

  const variants = {
    primary: {
      background: disabled ? "var(--action-primary-disabled)" : "var(--action-primary-bg)",
      color: disabled ? "var(--text-tertiary)" : "var(--action-primary-fg)",
    },
    secondary: {
      background: disabled ? "var(--neutral-300)" : "var(--action-secondary-bg)",
      color: disabled ? "var(--neutral-100)" : "var(--action-secondary-fg)",
    },
    tertiary: {
      background: "transparent",
      color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
      boxShadow: `inset 0 0 0 1.5px ${disabled ? "var(--border-subtle)" : "var(--border-strong)"}`,
    },
  };

  const onEnter = (e) => {
    if (disabled || loading) return;
    if (variant === "primary") {
      e.currentTarget.style.background = "var(--action-primary-bg-hover)";
      e.currentTarget.style.color = "var(--action-primary-fg-hover)";
    } else if (variant === "secondary") {
      e.currentTarget.style.background = "var(--action-secondary-bg-hover)";
    } else {
      e.currentTarget.style.background = "var(--neutral-100)";
    }
  };
  const onLeave = (e) => {
    Object.assign(e.currentTarget.style, {
      background: variants[variant].background || "transparent",
      color: variants[variant].color,
    });
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onMouseDown={(e) => { if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
      onFocus={(e) => { e.currentTarget.style.boxShadow = (variants[variant].boxShadow ? variants[variant].boxShadow + ", " : "") + "var(--shadow-focus)"; }}
      onBlur={(e) => { e.currentTarget.style.boxShadow = variants[variant].boxShadow || "none"; }}
      style={{ ...base, ...variants[variant], gap: sizes[size].gap, ...style }}
      {...rest}
    >
      {loading ? <Spinner /> : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <span
      aria-label="loading"
      style={{
        width: "1em", height: "1em", display: "inline-block",
        border: "2px solid currentColor", borderTopColor: "transparent",
        borderRadius: "50%", animation: "od-spin 0.7s linear infinite", opacity: 0.85,
      }}
    >
      <style>{`@keyframes od-spin{to{transform:rotate(360deg)}}`}</style>
    </span>
  );
}

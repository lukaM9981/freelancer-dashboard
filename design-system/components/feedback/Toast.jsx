import React from "react";

/** Olifant Digital — Toast. Flat notification with status accent + icon. */
export function Toast({ variant = "default", title, message, onClose, style = {} }) {
  const config = {
    default: { icon: "info", color: "var(--text-primary)", accent: "var(--neutral-300)" },
    success: { icon: "check-circle", color: "var(--success-fg)", accent: "var(--success-solid)" },
    error:   { icon: "alert-triangle", color: "var(--error-fg)", accent: "var(--error-solid)" },
    info:    { icon: "info", color: "var(--info-fg)", accent: "var(--info-solid)" },
    brand:   { icon: "sparkles", color: "var(--yellow-800)", accent: "var(--yellow-400)" },
  }[variant];
  return (
    <div role="status" style={{
      display: "flex", alignItems: "flex-start", gap: "12px", width: "100%", maxWidth: 380,
      background: "var(--white)", borderRadius: "var(--radius-md)", padding: "14px 16px",
      boxShadow: "var(--shadow-md)", borderLeft: `3px solid ${config.accent}`, boxSizing: "border-box", ...style,
    }}>
      <span style={{ color: config.color, display: "inline-flex", marginTop: 1 }}><i data-lucide={config.icon} style={{ width: 18, height: 18 }}></i></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)", fontSize: "15px", color: "var(--text-primary)" }}>{title}</div>}
        {message && <div style={{ fontFamily: "var(--font-sans)", fontSize: "14px", color: "var(--text-secondary)", marginTop: title ? 2 : 0 }}>{message}</div>}
      </div>
      {onClose && <button onClick={onClose} aria-label="Dismiss" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-tertiary)", display: "inline-flex", padding: 2 }}><i data-lucide="x" style={{ width: 16, height: 16 }}></i></button>}
    </div>
  );
}

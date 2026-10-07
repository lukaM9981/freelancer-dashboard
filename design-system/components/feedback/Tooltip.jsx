import React from "react";

/** Olifant Digital — Tooltip. Hover/focus ink bubble. */
export function Tooltip({ label, placement = "top", children, style = {} }) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: { bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)" },
    left: { right: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
    right: { left: "calc(100% + 8px)", top: "50%", transform: "translateY(-50%)" },
  }[placement];
  return (
    <span style={{ position: "relative", display: "inline-flex", ...style }}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)} onBlur={() => setShow(false)}>
      {children}
      {show && (
        <span role="tooltip" style={{
          position: "absolute", zIndex: 1100, ...pos, whiteSpace: "nowrap",
          background: "var(--neutral-900)", color: "var(--text-inverse)",
          fontFamily: "var(--font-sans)", fontSize: "13px", lineHeight: "16px", fontWeight: "var(--weight-medium)",
          padding: "6px 10px", borderRadius: "var(--radius-sm)", boxShadow: "var(--shadow-md)",
          pointerEvents: "none", animation: "od-fade 120ms ease",
        }}>{label}</span>
      )}
    </span>
  );
}

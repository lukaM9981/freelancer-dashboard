import React from "react";

/**
 * Olifant Digital — Card. Flat white surface with subtle border or soft shadow.
 * variant: default | bordered | elevated | accent (case-study yellow frame) | inverse (ink)
 */
export function Card({ variant = "default", padding = "24px", style = {}, children, ...rest }) {
  const variants = {
    default: { background: "var(--background-raised)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" },
    bordered: { background: "var(--background-raised)", boxShadow: "inset 0 0 0 1px var(--border-subtle)" },
    elevated: { background: "var(--background-raised)", boxShadow: "var(--shadow-md)" },
    accent: { background: "var(--white)", boxShadow: "inset 0 0 0 1.5px var(--yellow-400)" },
    subtle: { background: "var(--background-sunken)", boxShadow: "none" },
    inverse: { background: "var(--background-inverse)", boxShadow: "none", color: "var(--text-inverse)" },
  };
  return (
    <div style={{ borderRadius: "var(--radius-lg)", padding, boxSizing: "border-box", ...variants[variant], ...style }} {...rest}>
      {children}
    </div>
  );
}

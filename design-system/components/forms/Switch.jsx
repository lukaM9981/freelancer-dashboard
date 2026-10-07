import React from "react";

/** Olifant Digital — Switch. ON state fills pine green (semantic positive). */
export function Switch({ label, checked = false, disabled = false, onChange, id, ...rest }) {
  const reactId = React.useId();
  const inputId = id || reactId;
  return (
    <label htmlFor={inputId} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <span style={{
        position: "relative", width: 44, height: 24, flexShrink: 0, borderRadius: "var(--radius-full)",
        background: checked ? "var(--pine-600)" : "var(--neutral-300)",
        transition: "background 160ms cubic-bezier(0.2,0,0,1)",
      }}>
        <input type="checkbox" id={inputId} checked={checked} disabled={disabled} onChange={onChange}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        <span style={{
          position: "absolute", top: 2, left: checked ? 22 : 2, width: 20, height: 20,
          borderRadius: "var(--radius-full)", background: "var(--white)", boxShadow: "var(--shadow-sm)",
          transition: "left 160ms cubic-bezier(0.2,0,0,1)",
        }} />
      </span>
      {label && <span style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

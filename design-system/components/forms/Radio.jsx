import React from "react";

/** Olifant Digital — Radio. Single-select control; selected dot fills ink. */
export function Radio({ label, checked = false, disabled = false, onChange, name, value, id, ...rest }) {
  const reactId = React.useId();
  const inputId = id || reactId;
  return (
    <label htmlFor={inputId} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <span style={{
        position: "relative", width: 20, height: 20, flexShrink: 0, borderRadius: "var(--radius-full)",
        background: "var(--white)",
        boxShadow: `inset 0 0 0 1.5px ${checked ? "var(--neutral-900)" : "var(--border-medium)"}`,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "box-shadow 120ms ease",
      }}>
        <input type="radio" id={inputId} name={name} value={value} checked={checked} disabled={disabled} onChange={onChange}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        {checked && <span style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: "var(--neutral-900)" }} />}
      </span>
      {label && <span style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

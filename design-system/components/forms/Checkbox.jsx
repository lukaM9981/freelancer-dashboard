import React from "react";

/** Olifant Digital — Checkbox. Checked/indeterminate fill brand yellow with ink glyph. */
export function Checkbox({ label, checked = false, indeterminate = false, disabled = false, onChange, id, ...rest }) {
  const reactId = React.useId();
  const inputId = id || reactId;
  const filled = checked || indeterminate;
  return (
    <label htmlFor={inputId} style={{ display: "inline-flex", alignItems: "center", gap: "10px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}>
      <span style={{
        position: "relative", width: 20, height: 20, flexShrink: 0,
        borderRadius: "var(--radius-xs)",
        background: filled ? "var(--yellow-400)" : "var(--white)",
        boxShadow: filled ? "none" : "inset 0 0 0 1.5px var(--border-medium)",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        transition: "background 120ms ease, box-shadow 120ms ease",
      }}>
        <input type="checkbox" id={inputId} checked={checked} disabled={disabled}
          onChange={onChange} ref={(el) => { if (el) el.indeterminate = indeterminate; }}
          style={{ position: "absolute", opacity: 0, width: "100%", height: "100%", margin: 0, cursor: "inherit" }} {...rest} />
        {indeterminate ? (
          <span style={{ width: 10, height: 2, background: "var(--neutral-900)", borderRadius: 1 }} />
        ) : checked ? (
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.8L5 9.3L10.5 3.5" stroke="#19130D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        ) : null}
      </span>
      {label && <span style={{ fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)" }}>{label}</span>}
    </label>
  );
}

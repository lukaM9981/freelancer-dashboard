import React from "react";

/** Olifant Digital — Select. Native select styled to match Input. */
export function Select({ label, helperText, disabled = false, id, children, style = {}, containerStyle = {}, ...rest }) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...containerStyle }}>
      {label && <label htmlFor={inputId} style={{ fontFamily: "var(--font-sans)", fontWeight: "var(--weight-medium)", fontSize: "14px", color: focused ? "var(--text-accent)" : "var(--text-primary)", transition: "color 150ms ease" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <select
          id={inputId} disabled={disabled}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", height: "var(--control-md)", padding: "0 40px 0 16px",
            appearance: "none", WebkitAppearance: "none",
            fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)",
            background: disabled ? "var(--neutral-100)" : "var(--white)",
            border: `1.5px solid ${focused ? "var(--neutral-900)" : "var(--border-subtle)"}`,
            borderRadius: "var(--radius-sm)", outline: "none",
            boxShadow: focused ? "var(--shadow-focus)" : "none",
            transition: "border-color 150ms ease, box-shadow 150ms ease",
            opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer", ...style,
          }}
          {...rest}
        >{children}</select>
        <span style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--text-secondary)", display: "inline-flex" }}>
          <i data-lucide="chevron-down" style={{ width: 18, height: 18 }}></i>
        </span>
      </div>
      {helperText && <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{helperText}</span>}
    </div>
  );
}

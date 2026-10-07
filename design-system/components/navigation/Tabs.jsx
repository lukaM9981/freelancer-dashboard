import React from "react";

/** Olifant Digital — Tabs. Underline-style tabs; active tab gets a yellow rule. */
export function Tabs({ tabs = [], value, defaultValue, onChange, style = {}, children }) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;
  const select = (v) => { setInternal(v); onChange?.(v); };
  return (
    <div style={style}>
      <div role="tablist" style={{ display: "flex", gap: "4px", borderBottom: "1px solid var(--border-subtle)" }}>
        {tabs.map((t) => {
          const isActive = t.value === active;
          return (
            <button key={t.value} role="tab" aria-selected={isActive} onClick={() => select(t.value)} style={{
              position: "relative", border: "none", background: "transparent", cursor: "pointer",
              padding: "10px 16px", marginBottom: "-1px",
              fontFamily: "var(--font-sans)", fontWeight: isActive ? "var(--weight-bold)" : "var(--weight-medium)",
              fontSize: "15px", color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              borderBottom: `2px solid ${isActive ? "var(--yellow-400)" : "transparent"}`,
              transition: "color 150ms ease, border-color 150ms ease",
            }}>{t.label}</button>
          );
        })}
      </div>
      {children && <div style={{ paddingTop: "20px" }}>{typeof children === "function" ? children(active) : children}</div>}
    </div>
  );
}

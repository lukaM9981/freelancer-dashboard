import React from "react";

/** Olifant Digital — Dialog (modal). Flat white panel, ink scrim, soft shadow. */
export function Dialog({ open, onClose, title, children, footer, width = 480, style = {} }) {
  if (!open) return null;
  return (
    <div onMouseDown={onClose} style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,11,8,0.55)", padding: "24px", animation: "od-fade 150ms ease",
    }}>
      <div role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()} style={{
        width: "100%", maxWidth: width, background: "var(--white)", borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)", padding: "28px", boxSizing: "border-box", animation: "od-pop 160ms cubic-bezier(0.2,0,0,1)", ...style,
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "12px" }}>
          {title && <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: "var(--weight-bold)", fontSize: "26px", lineHeight: "32px", margin: 0 }}>{title}</h3>}
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--text-secondary)", display: "inline-flex", padding: 4, marginTop: 2 }}>
            <i data-lucide="x" style={{ width: 20, height: 20 }}></i>
          </button>
        </div>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: "16px", lineHeight: "24px", color: "var(--text-secondary)" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>{footer}</div>}
      </div>
      <style>{`@keyframes od-fade{from{opacity:0}to{opacity:1}}@keyframes od-pop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}

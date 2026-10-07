import React from "react";

/** Olifant Digital — Avatar. Initials or image, circular. */
export function Avatar({ src, name = "", size = "md", style = {}, ...rest }) {
  const dims = { xs: 24, sm: 32, md: 40, lg: 56, xl: 72 }[size] || 40;
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const fontSize = Math.round(dims * 0.4);
  return (
    <span style={{
      width: dims, height: dims, flexShrink: 0, borderRadius: "var(--radius-full)", overflow: "hidden",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: "var(--pine-200)", color: "var(--pine-800)",
      fontFamily: "var(--font-sans)", fontWeight: "var(--weight-bold)", fontSize, ...style,
    }} {...rest}>
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

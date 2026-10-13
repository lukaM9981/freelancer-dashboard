// Email clients don't load the brand fonts reliably: Georgia for headings, the system
// sans-serif for text (Tech.md §9).
const sans = "system-ui, -apple-system, Segoe UI, sans-serif";

export const body = {
  backgroundColor: "#FFFEF9",
  fontFamily: "Georgia, 'Times New Roman', serif",
  margin: "0",
  padding: "32px 16px",
};

export const container = {
  backgroundColor: "#ffffff",
  border: "1px solid #d1cdc7",
  borderRadius: "16px",
  margin: "0 auto",
  maxWidth: "480px",
  padding: "32px",
};

export const heading = {
  color: "#19130D",
  fontSize: "28px",
  fontWeight: "700",
  lineHeight: "1.2",
  margin: "24px 0 8px",
};

export const text = {
  color: "#19130D",
  fontFamily: sans,
  fontSize: "16px",
  lineHeight: "1.5",
  margin: "0 0 24px",
};

export const itemTitle = {
  color: "#19130D",
  fontFamily: sans,
  fontSize: "15px",
  fontWeight: "700",
  lineHeight: "1.4",
  margin: "0",
};

export const itemDetail = {
  color: "#70675c",
  fontFamily: sans,
  fontSize: "14px",
  lineHeight: "1.4",
  margin: "2px 0 0",
  whiteSpace: "pre-line" as const,
};

export const item = {
  borderTop: "1px solid #e8e5e0",
  padding: "12px 0",
};

export const button = {
  backgroundColor: "#ffd046",
  borderRadius: "999px",
  color: "#19130D",
  display: "inline-block",
  fontFamily: sans,
  fontSize: "16px",
  fontWeight: "700",
  padding: "12px 24px",
  textDecoration: "none",
};

export const fine = {
  color: "#70675c",
  fontFamily: sans,
  fontSize: "13px",
  lineHeight: "1.4",
  margin: "24px 0 0",
};

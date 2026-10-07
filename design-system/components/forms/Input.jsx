import React from "react";

/** Olifant Digital — Text Input with label, helper text and error/success states. */
export function Input({
  label,
  helperText,
  errorText,
  state = "default", // default | error | success
  disabled = false,
  id,
  style = {},
  containerStyle = {},
  iconLeft = null,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  const isError = state === "error";
  const isSuccess = state === "success";

  const borderColor = isError
    ? "var(--error-solid)"
    : focused
    ? "var(--neutral-900)"
    : "var(--border-subtle)";

  const labelColor = isError
    ? "var(--error-fg)"
    : focused
    ? "var(--text-accent)"
    : "var(--text-primary)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", width: "100%", ...containerStyle }}>
      {label && (
        <label htmlFor={inputId} style={{
          fontFamily: "var(--font-sans)", fontWeight: "var(--weight-medium)",
          fontSize: "14px", color: labelColor, transition: "color 150ms ease",
        }}>{label}</label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {iconLeft && (
          <span style={{ position: "absolute", left: "14px", display: "inline-flex", color: "var(--text-tertiary)", pointerEvents: "none" }}>{iconLeft}</span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
          style={{
            width: "100%",
            height: "var(--control-md)",
            padding: iconLeft ? "0 16px 0 42px" : "0 16px",
            fontFamily: "var(--font-sans)", fontSize: "16px", color: "var(--text-primary)",
            background: disabled ? "var(--neutral-100)" : "var(--white)",
            border: `1.5px solid ${borderColor}`,
            borderRadius: "var(--radius-sm)",
            outline: "none",
            boxShadow: focused && !isError ? "var(--shadow-focus)" : "none",
            transition: "border-color 150ms ease, box-shadow 150ms ease",
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? "not-allowed" : "text",
            ...style,
          }}
          {...rest}
        />
      </div>
      {(errorText && isError) ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "var(--error-fg)" }}>
          <i data-lucide="alert-triangle" style={{ width: 14, height: 14 }}></i>{errorText}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: "13px", color: isSuccess ? "var(--success-fg)" : "var(--text-secondary)" }}>{helperText}</span>
      ) : null}
    </div>
  );
}

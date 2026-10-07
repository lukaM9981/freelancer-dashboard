/* @ds-bundle: {"format":3,"namespace":"OlifantDigitalDesignSystem_8e3542","components":[{"name":"Avatar","sourcePath":"components/display/Avatar.jsx"},{"name":"Badge","sourcePath":"components/display/Badge.jsx"},{"name":"Card","sourcePath":"components/display/Card.jsx"},{"name":"StatCard","sourcePath":"components/display/StatCard.jsx"},{"name":"Tag","sourcePath":"components/display/Tag.jsx"},{"name":"Dialog","sourcePath":"components/feedback/Dialog.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Textarea","sourcePath":"components/forms/Textarea.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"}],"sourceHashes":{"components/display/Avatar.jsx":"db4333cdd9cf","components/display/Badge.jsx":"aea8cbe96f76","components/display/Card.jsx":"815ea5536ec7","components/display/StatCard.jsx":"1b0dd63f50db","components/display/Tag.jsx":"6733e597098b","components/feedback/Dialog.jsx":"6d3bfb0618d7","components/feedback/Toast.jsx":"e8a61b35139e","components/feedback/Tooltip.jsx":"cf8fb1dadc13","components/forms/Button.jsx":"a92fd8d4f3bb","components/forms/Checkbox.jsx":"b1dfc559472a","components/forms/IconButton.jsx":"7714af903fb1","components/forms/Input.jsx":"b32efd091958","components/forms/Radio.jsx":"31e163a73873","components/forms/Select.jsx":"d9c17ab83e04","components/forms/Switch.jsx":"981f3025c691","components/forms/Textarea.jsx":"2e0f0eb53255","components/navigation/Tabs.jsx":"aeb2c0f70421"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OlifantDigitalDesignSystem_8e3542 = window.OlifantDigitalDesignSystem_8e3542 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/display/Avatar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Avatar. Initials or image, circular. */
function Avatar({
  src,
  name = "",
  size = "md",
  style = {},
  ...rest
}) {
  const dims = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72
  }[size] || 40;
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const fontSize = Math.round(dims * 0.4);
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      width: dims,
      height: dims,
      flexShrink: 0,
      borderRadius: "var(--radius-full)",
      overflow: "hidden",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--pine-200)",
      color: "var(--pine-800)",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-bold)",
      fontSize,
      ...style
    }
  }, rest), src ? /*#__PURE__*/React.createElement("img", {
    src: src,
    alt: name,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "cover"
    }
  }) : initials);
}
Object.assign(__ds_scope, { Avatar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Avatar.jsx", error: String((e && e.message) || e) }); }

// components/display/Badge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Badge. Pill status label. variants match semantic colors. */
function Badge({
  variant = "default",
  size = "md",
  style = {},
  children,
  ...rest
}) {
  const variants = {
    default: {
      background: "var(--neutral-100)",
      color: "var(--text-secondary)"
    },
    brand: {
      background: "var(--yellow-100)",
      color: "var(--yellow-800)"
    },
    success: {
      background: "var(--success-bg)",
      color: "var(--success-fg)"
    },
    error: {
      background: "var(--error-bg)",
      color: "var(--error-fg)"
    },
    info: {
      background: "var(--info-bg)",
      color: "var(--info-fg)"
    },
    accent: {
      background: "var(--pine-100)",
      color: "var(--pine-700)"
    }
  };
  const sizes = {
    sm: {
      padding: "2px 8px",
      fontSize: "12px",
      lineHeight: "16px"
    },
    md: {
      padding: "4px 12px",
      fontSize: "13px",
      lineHeight: "18px"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      borderRadius: "var(--radius-full)",
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap",
      ...sizes[size],
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Badge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Badge.jsx", error: String((e && e.message) || e) }); }

// components/display/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Olifant Digital — Card. Flat white surface with subtle border or soft shadow.
 * variant: default | bordered | elevated | accent (case-study yellow frame) | inverse (ink)
 */
function Card({
  variant = "default",
  padding = "24px",
  style = {},
  children,
  ...rest
}) {
  const variants = {
    default: {
      background: "var(--background-raised)",
      boxShadow: "inset 0 0 0 1px var(--border-subtle)"
    },
    bordered: {
      background: "var(--background-raised)",
      boxShadow: "inset 0 0 0 1px var(--border-subtle)"
    },
    elevated: {
      background: "var(--background-raised)",
      boxShadow: "var(--shadow-md)"
    },
    accent: {
      background: "var(--white)",
      boxShadow: "inset 0 0 0 1.5px var(--yellow-400)"
    },
    subtle: {
      background: "var(--background-sunken)",
      boxShadow: "none"
    },
    inverse: {
      background: "var(--background-inverse)",
      boxShadow: "none",
      color: "var(--text-inverse)"
    }
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius-lg)",
      padding,
      boxSizing: "border-box",
      ...variants[variant],
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Card.jsx", error: String((e && e.message) || e) }); }

// components/display/StatCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — StatCard. Big Satoshi-Black number + caption. Data-forward. */
function StatCard({
  value,
  label,
  trend,
  trendDirection = "up",
  variant = "default",
  style = {},
  ...rest
}) {
  const inverse = variant === "inverse";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      borderRadius: "var(--radius-lg)",
      padding: "24px",
      boxSizing: "border-box",
      background: inverse ? "var(--background-inverse)" : "var(--background-raised)",
      boxShadow: inverse ? "none" : "inset 0 0 0 1px var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-black)",
      fontSize: "48px",
      lineHeight: "1",
      letterSpacing: "-0.02em",
      color: inverse ? "var(--text-inverse)" : "var(--text-primary)"
    }
  }, value), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: inverse ? "var(--neutral-300)" : "var(--text-secondary)"
    }
  }, label), trend && /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      marginTop: "4px",
      color: trendDirection === "down" ? "var(--error-fg)" : "var(--success-fg)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": trendDirection === "down" ? "trending-down" : "trending-up",
    style: {
      width: 16,
      height: 16
    }
  }), trend));
}
Object.assign(__ds_scope, { StatCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/StatCard.jsx", error: String((e && e.message) || e) }); }

// components/display/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Tag. Outlined/soft chip, optionally removable. */
function Tag({
  removable = false,
  onRemove,
  variant = "default",
  style = {},
  children,
  ...rest
}) {
  const variants = {
    default: {
      background: "var(--white)",
      color: "var(--text-primary)",
      boxShadow: "inset 0 0 0 1px var(--border-subtle)"
    },
    brand: {
      background: "var(--yellow-50)",
      color: "var(--yellow-800)",
      boxShadow: "inset 0 0 0 1px var(--yellow-300)"
    },
    accent: {
      background: "var(--pine-50)",
      color: "var(--pine-700)",
      boxShadow: "inset 0 0 0 1px var(--pine-200)"
    }
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: removable ? "4px 6px 4px 12px" : "4px 12px",
      borderRadius: "var(--radius-full)",
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      fontWeight: "var(--weight-medium)",
      whiteSpace: "nowrap",
      ...variants[variant],
      ...style
    }
  }, rest), children, removable && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onRemove,
    "aria-label": "Remove",
    style: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 18,
      height: 18,
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "inherit",
      opacity: 0.6,
      borderRadius: "var(--radius-full)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 14,
      height: 14
    }
  })));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/display/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Dialog.jsx
try { (() => {
/** Olifant Digital — Dialog (modal). Flat white panel, ink scrim, soft shadow. */
function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  width = 480,
  style = {}
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onMouseDown: onClose,
    style: {
      position: "fixed",
      inset: 0,
      zIndex: 1000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "rgba(15,11,8,0.55)",
      padding: "24px",
      animation: "od-fade 150ms ease"
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onMouseDown: e => e.stopPropagation(),
    style: {
      width: "100%",
      maxWidth: width,
      background: "var(--white)",
      borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)",
      padding: "28px",
      boxSizing: "border-box",
      animation: "od-pop 160ms cubic-bezier(0.2,0,0,1)",
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: "16px",
      marginBottom: "12px"
    }
  }, title && /*#__PURE__*/React.createElement("h3", {
    style: {
      fontFamily: "var(--font-serif)",
      fontWeight: "var(--weight-bold)",
      fontSize: "26px",
      lineHeight: "32px",
      margin: 0
    }
  }, title), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Close",
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-secondary)",
      display: "inline-flex",
      padding: 4,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 20,
      height: 20
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      lineHeight: "24px",
      color: "var(--text-secondary)"
    }
  }, children), footer && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end",
      gap: "12px",
      marginTop: "24px"
    }
  }, footer)), /*#__PURE__*/React.createElement("style", null, `@keyframes od-fade{from{opacity:0}to{opacity:1}}@keyframes od-pop{from{opacity:0;transform:translateY(8px) scale(0.98)}to{opacity:1;transform:none}}`));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
/** Olifant Digital — Toast. Flat notification with status accent + icon. */
function Toast({
  variant = "default",
  title,
  message,
  onClose,
  style = {}
}) {
  const config = {
    default: {
      icon: "info",
      color: "var(--text-primary)",
      accent: "var(--neutral-300)"
    },
    success: {
      icon: "check-circle",
      color: "var(--success-fg)",
      accent: "var(--success-solid)"
    },
    error: {
      icon: "alert-triangle",
      color: "var(--error-fg)",
      accent: "var(--error-solid)"
    },
    info: {
      icon: "info",
      color: "var(--info-fg)",
      accent: "var(--info-solid)"
    },
    brand: {
      icon: "sparkles",
      color: "var(--yellow-800)",
      accent: "var(--yellow-400)"
    }
  }[variant];
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      width: "100%",
      maxWidth: 380,
      background: "var(--white)",
      borderRadius: "var(--radius-md)",
      padding: "14px 16px",
      boxShadow: "var(--shadow-md)",
      borderLeft: `3px solid ${config.accent}`,
      boxSizing: "border-box",
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: config.color,
      display: "inline-flex",
      marginTop: 1
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": config.icon,
    style: {
      width: 18,
      height: 18
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-bold)",
      fontSize: "15px",
      color: "var(--text-primary)"
    }
  }, title), message && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "14px",
      color: "var(--text-secondary)",
      marginTop: title ? 2 : 0
    }
  }, message)), onClose && /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    "aria-label": "Dismiss",
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--text-tertiary)",
      display: "inline-flex",
      padding: 2
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "x",
    style: {
      width: 16,
      height: 16
    }
  })));
}
Object.assign(__ds_scope, { Toast });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/** Olifant Digital — Tooltip. Hover/focus ink bubble. */
function Tooltip({
  label,
  placement = "top",
  children,
  style = {}
}) {
  const [show, setShow] = React.useState(false);
  const pos = {
    top: {
      bottom: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    bottom: {
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)"
    },
    left: {
      right: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    },
    right: {
      left: "calc(100% + 8px)",
      top: "50%",
      transform: "translateY(-50%)"
    }
  }[placement];
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      display: "inline-flex",
      ...style
    },
    onMouseEnter: () => setShow(true),
    onMouseLeave: () => setShow(false),
    onFocus: () => setShow(true),
    onBlur: () => setShow(false)
  }, children, show && /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    style: {
      position: "absolute",
      zIndex: 1100,
      ...pos,
      whiteSpace: "nowrap",
      background: "var(--neutral-900)",
      color: "var(--text-inverse)",
      fontFamily: "var(--font-sans)",
      fontSize: "13px",
      lineHeight: "16px",
      fontWeight: "var(--weight-medium)",
      padding: "6px 10px",
      borderRadius: "var(--radius-sm)",
      boxShadow: "var(--shadow-md)",
      pointerEvents: "none",
      animation: "od-fade 120ms ease"
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Olifant Digital — Button
 * Pill-shaped, serif (Wulkan) label. Primary inverts yellow→ink on hover.
 */
function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  iconLeft = null,
  iconRight = null,
  type = "button",
  fullWidth = false,
  children,
  style = {},
  ...rest
}) {
  const sizes = {
    sm: {
      padding: "8px 20px",
      fontSize: "16px",
      lineHeight: "20px",
      gap: "6px"
    },
    md: {
      padding: "12px 28px",
      fontSize: "18px",
      lineHeight: "22px",
      gap: "8px"
    },
    lg: {
      padding: "16px 32px",
      fontSize: "22px",
      lineHeight: "26px",
      gap: "10px"
    }
  };
  const isTertiary = variant === "tertiary";
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: fullWidth ? "100%" : "auto",
    border: "none",
    borderRadius: "var(--radius-full)",
    fontFamily: isTertiary ? "var(--font-sans)" : "var(--font-serif)",
    fontWeight: isTertiary ? "var(--weight-bold)" : "var(--weight-bold)",
    textTransform: isTertiary ? "uppercase" : "none",
    letterSpacing: isTertiary ? "var(--tracking-wide)" : "var(--tracking-tight)",
    cursor: disabled || loading ? "not-allowed" : "pointer",
    transition: "background-color 150ms cubic-bezier(0.2,0,0,1), color 150ms cubic-bezier(0.2,0,0,1), transform 120ms ease, box-shadow 150ms ease",
    whiteSpace: "nowrap",
    outline: "none",
    ...sizes[size],
    ...(isTertiary ? {
      fontSize: size === "lg" ? "16px" : size === "sm" ? "13px" : "14px"
    } : {})
  };
  const variants = {
    primary: {
      background: disabled ? "var(--action-primary-disabled)" : "var(--action-primary-bg)",
      color: disabled ? "var(--text-tertiary)" : "var(--action-primary-fg)"
    },
    secondary: {
      background: disabled ? "var(--neutral-300)" : "var(--action-secondary-bg)",
      color: disabled ? "var(--neutral-100)" : "var(--action-secondary-fg)"
    },
    tertiary: {
      background: "transparent",
      color: disabled ? "var(--text-tertiary)" : "var(--text-primary)",
      boxShadow: `inset 0 0 0 1.5px ${disabled ? "var(--border-subtle)" : "var(--border-strong)"}`
    }
  };
  const onEnter = e => {
    if (disabled || loading) return;
    if (variant === "primary") {
      e.currentTarget.style.background = "var(--action-primary-bg-hover)";
      e.currentTarget.style.color = "var(--action-primary-fg-hover)";
    } else if (variant === "secondary") {
      e.currentTarget.style.background = "var(--action-secondary-bg-hover)";
    } else {
      e.currentTarget.style.background = "var(--neutral-100)";
    }
  };
  const onLeave = e => {
    Object.assign(e.currentTarget.style, {
      background: variants[variant].background || "transparent",
      color: variants[variant].color
    });
  };
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled || loading,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    onMouseDown: e => {
      if (!disabled && !loading) e.currentTarget.style.transform = "scale(0.98)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    },
    onFocus: e => {
      e.currentTarget.style.boxShadow = (variants[variant].boxShadow ? variants[variant].boxShadow + ", " : "") + "var(--shadow-focus)";
    },
    onBlur: e => {
      e.currentTarget.style.boxShadow = variants[variant].boxShadow || "none";
    },
    style: {
      ...base,
      ...variants[variant],
      gap: sizes[size].gap,
      ...style
    }
  }, rest), loading ? /*#__PURE__*/React.createElement(Spinner, null) : /*#__PURE__*/React.createElement(React.Fragment, null, iconLeft, children, iconRight));
}
function Spinner() {
  return /*#__PURE__*/React.createElement("span", {
    "aria-label": "loading",
    style: {
      width: "1em",
      height: "1em",
      display: "inline-block",
      border: "2px solid currentColor",
      borderTopColor: "transparent",
      borderRadius: "50%",
      animation: "od-spin 0.7s linear infinite",
      opacity: 0.85
    }
  }, /*#__PURE__*/React.createElement("style", null, `@keyframes od-spin{to{transform:rotate(360deg)}}`));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Checkbox. Checked/indeterminate fill brand yellow with ink glyph. */
function Checkbox({
  label,
  checked = false,
  indeterminate = false,
  disabled = false,
  onChange,
  id,
  ...rest
}) {
  const reactId = React.useId();
  const inputId = id || reactId;
  const filled = checked || indeterminate;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 20,
      height: 20,
      flexShrink: 0,
      borderRadius: "var(--radius-xs)",
      background: filled ? "var(--yellow-400)" : "var(--white)",
      boxShadow: filled ? "none" : "inset 0 0 0 1.5px var(--border-medium)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background 120ms ease, box-shadow 120ms ease"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: inputId,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    ref: el => {
      if (el) el.indeterminate = indeterminate;
    },
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), indeterminate ? /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 2,
      background: "var(--neutral-900)",
      borderRadius: 1
    }
  }) : checked ? /*#__PURE__*/React.createElement("svg", {
    width: "13",
    height: "13",
    viewBox: "0 0 13 13",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2.5 6.8L5 9.3L10.5 3.5",
    stroke: "#19130D",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })) : null), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — IconButton. Square/circular icon-only action. */
function IconButton({
  variant = "tertiary",
  size = "md",
  shape = "circle",
  disabled = false,
  label,
  children,
  style = {},
  ...rest
}) {
  const dims = {
    sm: 32,
    md: 40,
    lg: 48
  }[size];
  const variants = {
    primary: {
      background: "var(--yellow-400)",
      color: "var(--neutral-900)",
      boxShadow: "none"
    },
    secondary: {
      background: "var(--neutral-900)",
      color: "var(--neutral-50)",
      boxShadow: "none"
    },
    tertiary: {
      background: "transparent",
      color: "var(--text-primary)",
      boxShadow: "inset 0 0 0 1.5px var(--border-strong)"
    },
    ghost: {
      background: "transparent",
      color: "var(--text-primary)",
      boxShadow: "none"
    }
  };
  const v = variants[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    "aria-label": label,
    title: label,
    disabled: disabled,
    onMouseEnter: e => {
      if (!disabled && (variant === "tertiary" || variant === "ghost")) e.currentTarget.style.background = "var(--neutral-100)";
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = v.background;
    },
    style: {
      width: dims,
      height: dims,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      border: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.45 : 1,
      borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-sm)",
      transition: "background-color 150ms ease, transform 120ms ease",
      ...v,
      ...style
    },
    onMouseDown: e => {
      if (!disabled) e.currentTarget.style.transform = "scale(0.94)";
    },
    onMouseUp: e => {
      e.currentTarget.style.transform = "scale(1)";
    }
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Text Input with label, helper text and error/success states. */
function Input({
  label,
  helperText,
  errorText,
  state = "default",
  // default | error | success
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
  const borderColor = isError ? "var(--error-solid)" : focused ? "var(--neutral-900)" : "var(--border-subtle)";
  const labelColor = isError ? "var(--error-fg)" : focused ? "var(--text-accent)" : "var(--text-primary)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "14px",
      color: labelColor,
      transition: "color 150ms ease"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      display: "flex",
      alignItems: "center"
    }
  }, iconLeft && /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: "14px",
      display: "inline-flex",
      color: "var(--text-tertiary)",
      pointerEvents: "none"
    }
  }, iconLeft), /*#__PURE__*/React.createElement("input", _extends({
    id: inputId,
    disabled: disabled,
    onFocus: e => {
      setFocused(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur?.(e);
    },
    style: {
      width: "100%",
      height: "var(--control-md)",
      padding: iconLeft ? "0 16px 0 42px" : "0 16px",
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-primary)",
      background: disabled ? "var(--neutral-100)" : "var(--white)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      outline: "none",
      boxShadow: focused && !isError ? "var(--shadow-focus)" : "none",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? "not-allowed" : "text",
      ...style
    }
  }, rest))), errorText && isError ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      color: "var(--error-fg)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "alert-triangle",
    style: {
      width: 14,
      height: 14
    }
  }), errorText) : helperText ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: isSuccess ? "var(--success-fg)" : "var(--text-secondary)"
    }
  }, helperText) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Radio. Single-select control; selected dot fills ink. */
function Radio({
  label,
  checked = false,
  disabled = false,
  onChange,
  name,
  value,
  id,
  ...rest
}) {
  const reactId = React.useId();
  const inputId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 20,
      height: 20,
      flexShrink: 0,
      borderRadius: "var(--radius-full)",
      background: "var(--white)",
      boxShadow: `inset 0 0 0 1.5px ${checked ? "var(--neutral-900)" : "var(--border-medium)"}`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "box-shadow 120ms ease"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "radio",
    id: inputId,
    name: name,
    value: value,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), checked && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: "var(--radius-full)",
      background: "var(--neutral-900)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Radio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Select. Native select styled to match Input. */
function Select({
  label,
  helperText,
  disabled = false,
  id,
  children,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "14px",
      color: focused ? "var(--text-accent)" : "var(--text-primary)",
      transition: "color 150ms ease"
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: inputId,
    disabled: disabled,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      width: "100%",
      height: "var(--control-md)",
      padding: "0 40px 0 16px",
      appearance: "none",
      WebkitAppearance: "none",
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-primary)",
      background: disabled ? "var(--neutral-100)" : "var(--white)",
      border: `1.5px solid ${focused ? "var(--neutral-900)" : "var(--border-subtle)"}`,
      borderRadius: "var(--radius-sm)",
      outline: "none",
      boxShadow: focused ? "var(--shadow-focus)" : "none",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
      opacity: disabled ? 0.6 : 1,
      cursor: disabled ? "not-allowed" : "pointer",
      ...style
    }
  }, rest), children), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      right: "14px",
      top: "50%",
      transform: "translateY(-50%)",
      pointerEvents: "none",
      color: "var(--text-secondary)",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "chevron-down",
    style: {
      width: 18,
      height: 18
    }
  }))), helperText && /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: "var(--text-secondary)"
    }
  }, helperText));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Switch. ON state fills pine green (semantic positive). */
function Switch({
  label,
  checked = false,
  disabled = false,
  onChange,
  id,
  ...rest
}) {
  const reactId = React.useId();
  const inputId = id || reactId;
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      cursor: disabled ? "not-allowed" : "pointer",
      opacity: disabled ? 0.5 : 1
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "relative",
      width: 44,
      height: 24,
      flexShrink: 0,
      borderRadius: "var(--radius-full)",
      background: checked ? "var(--pine-600)" : "var(--neutral-300)",
      transition: "background 160ms cubic-bezier(0.2,0,0,1)"
    }
  }, /*#__PURE__*/React.createElement("input", _extends({
    type: "checkbox",
    id: inputId,
    checked: checked,
    disabled: disabled,
    onChange: onChange,
    style: {
      position: "absolute",
      opacity: 0,
      width: "100%",
      height: "100%",
      margin: 0,
      cursor: "inherit"
    }
  }, rest)), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: 2,
      left: checked ? 22 : 2,
      width: 20,
      height: 20,
      borderRadius: "var(--radius-full)",
      background: "var(--white)",
      boxShadow: "var(--shadow-sm)",
      transition: "left 160ms cubic-bezier(0.2,0,0,1)"
    }
  })), label && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      color: "var(--text-primary)"
    }
  }, label));
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/forms/Textarea.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/** Olifant Digital — Textarea. Multi-line text field matching Input styling. */
function Textarea({
  label,
  helperText,
  errorText,
  state = "default",
  disabled = false,
  rows = 4,
  id,
  style = {},
  containerStyle = {},
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const reactId = React.useId();
  const inputId = id || reactId;
  const isError = state === "error";
  const borderColor = isError ? "var(--error-solid)" : focused ? "var(--neutral-900)" : "var(--border-subtle)";
  const labelColor = isError ? "var(--error-fg)" : focused ? "var(--text-accent)" : "var(--text-primary)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      width: "100%",
      ...containerStyle
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: "var(--weight-medium)",
      fontSize: "14px",
      color: labelColor,
      transition: "color 150ms ease"
    }
  }, label), /*#__PURE__*/React.createElement("textarea", _extends({
    id: inputId,
    rows: rows,
    disabled: disabled,
    onFocus: e => {
      setFocused(true);
      rest.onFocus?.(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur?.(e);
    },
    style: {
      width: "100%",
      padding: "12px 16px",
      resize: "vertical",
      fontFamily: "var(--font-sans)",
      fontSize: "16px",
      lineHeight: "24px",
      color: "var(--text-primary)",
      background: disabled ? "var(--neutral-100)" : "var(--white)",
      border: `1.5px solid ${borderColor}`,
      borderRadius: "var(--radius-sm)",
      outline: "none",
      boxShadow: focused && !isError ? "var(--shadow-focus)" : "none",
      transition: "border-color 150ms ease, box-shadow 150ms ease",
      opacity: disabled ? 0.6 : 1,
      ...style
    }
  }, rest)), errorText && isError ? /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      fontSize: "13px",
      color: "var(--error-fg)"
    }
  }, /*#__PURE__*/React.createElement("i", {
    "data-lucide": "alert-triangle",
    style: {
      width: 14,
      height: 14
    }
  }), errorText) : helperText ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "13px",
      color: "var(--text-secondary)"
    }
  }, helperText) : null);
}
Object.assign(__ds_scope, { Textarea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Textarea.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/** Olifant Digital — Tabs. Underline-style tabs; active tab gets a yellow rule. */
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  style = {},
  children
}) {
  const [internal, setInternal] = React.useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;
  const select = v => {
    setInternal(v);
    onChange?.(v);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: "flex",
      gap: "4px",
      borderBottom: "1px solid var(--border-subtle)"
    }
  }, tabs.map(t => {
    const isActive = t.value === active;
    return /*#__PURE__*/React.createElement("button", {
      key: t.value,
      role: "tab",
      "aria-selected": isActive,
      onClick: () => select(t.value),
      style: {
        position: "relative",
        border: "none",
        background: "transparent",
        cursor: "pointer",
        padding: "10px 16px",
        marginBottom: "-1px",
        fontFamily: "var(--font-sans)",
        fontWeight: isActive ? "var(--weight-bold)" : "var(--weight-medium)",
        fontSize: "15px",
        color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
        borderBottom: `2px solid ${isActive ? "var(--yellow-400)" : "transparent"}`,
        transition: "color 150ms ease, border-color 150ms ease"
      }
    }, t.label);
  })), children && /*#__PURE__*/React.createElement("div", {
    style: {
      paddingTop: "20px"
    }
  }, typeof children === "function" ? children(active) : children));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Avatar = __ds_scope.Avatar;

__ds_ns.Badge = __ds_scope.Badge;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.StatCard = __ds_scope.StatCard;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Textarea = __ds_scope.Textarea;

__ds_ns.Tabs = __ds_scope.Tabs;

})();

import * as React from "react";

export interface ToastProps {
  variant?: "default" | "success" | "error" | "info" | "brand";
  title?: string;
  message?: string;
  onClose?: () => void;
  style?: React.CSSProperties;
}

/** Flat toast notification with a status accent bar + icon. */
export function Toast(props: ToastProps): JSX.Element;

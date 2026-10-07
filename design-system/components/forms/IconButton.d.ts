import * as React from "react";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tertiary" | "ghost";
  size?: "sm" | "md" | "lg";
  shape?: "circle" | "square";
  disabled?: boolean;
  /** Accessible label (also the tooltip title). Required. */
  label: string;
  /** The icon element (e.g. a Lucide <i data-lucide> or <svg>). */
  children?: React.ReactNode;
}

/** Icon-only button. Pass an accessible `label`. */
export function IconButton(props: IconButtonProps): JSX.Element;

import * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style. primary = yellow→ink invert; secondary = solid ink; tertiary = outlined uppercase. */
  variant?: "primary" | "secondary" | "tertiary";
  /** Size. lg uses 22px serif label. */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  /** Shows a spinner and blocks interaction. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

/**
 * Pill button with a serif (Wulkan) label. The primary variant inverts from
 * brand yellow to ink on hover — Olifant's signature interaction.
 *
 * @startingPoint section="Forms" subtitle="Pill button, 3 variants × 3 sizes" viewport="700x220"
 */
export function Button(props: ButtonProps): JSX.Element;

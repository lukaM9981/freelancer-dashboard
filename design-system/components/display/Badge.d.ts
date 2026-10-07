import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "brand" | "success" | "error" | "info" | "accent";
  size?: "sm" | "md";
  children?: React.ReactNode;
}

/**
 * Small pill status label.
 * @startingPoint section="Display" subtitle="Status badges" viewport="700x80"
 */
export function Badge(props: BadgeProps): JSX.Element;

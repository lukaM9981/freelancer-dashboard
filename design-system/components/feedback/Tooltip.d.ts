import * as React from "react";

export interface TooltipProps {
  label: string;
  placement?: "top" | "bottom" | "left" | "right";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Ink tooltip bubble shown on hover/focus of its child. */
export function Tooltip(props: TooltipProps): JSX.Element;

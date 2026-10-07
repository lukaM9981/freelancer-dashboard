import * as React from "react";

export interface TagProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "brand" | "accent";
  removable?: boolean;
  onRemove?: () => void;
  children?: React.ReactNode;
}

/** Outlined chip for filters/keywords. Set `removable` to show an × button. */
export function Tag(props: TagProps): JSX.Element;

import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string;
  /** Used for initials fallback + alt text. */
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

/** Circular avatar — image, or initials on a pine field as fallback. */
export function Avatar(props: AvatarProps): JSX.Element;

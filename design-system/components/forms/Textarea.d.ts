import * as React from "react";

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "style"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  state?: "default" | "error" | "success";
  disabled?: boolean;
  rows?: number;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

/** Multi-line text field, styled to match Input. */
export function Textarea(props: TextareaProps): JSX.Element;

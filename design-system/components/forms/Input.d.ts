import * as React from "react";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "style"> {
  label?: string;
  helperText?: string;
  errorText?: string;
  state?: "default" | "error" | "success";
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

/**
 * Labeled text input. Focus turns the border ink + label pine and adds a soft
 * yellow ring; `state="error"` shows a red border and message.
 *
 * @startingPoint section="Forms" subtitle="Text input with label + states" viewport="700x120"
 */
export function Input(props: InputProps): JSX.Element;

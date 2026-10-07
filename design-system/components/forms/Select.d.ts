import * as React from "react";

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "style"> {
  label?: string;
  helperText?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  containerStyle?: React.CSSProperties;
}

/** Native select styled to match Input. Pass <option> children. */
export function Select(props: SelectProps): JSX.Element;

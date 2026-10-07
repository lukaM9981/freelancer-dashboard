import * as React from "react";

export interface CheckboxProps {
  label?: string;
  checked?: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  id?: string;
}

/** Checkbox. Checked/indeterminate fill brand yellow with an ink glyph. */
export function Checkbox(props: CheckboxProps): JSX.Element;

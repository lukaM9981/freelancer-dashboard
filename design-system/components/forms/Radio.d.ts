import * as React from "react";

export interface RadioProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  name?: string;
  value?: string;
  id?: string;
}

/** Radio button for single-select groups. Share a `name` across the group. */
export function Radio(props: RadioProps): JSX.Element;

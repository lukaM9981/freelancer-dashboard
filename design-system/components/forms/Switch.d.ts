import * as React from "react";

export interface SwitchProps {
  label?: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  id?: string;
}

/** Toggle switch. ON fills pine green. Use for binary on/off settings. */
export function Switch(props: SwitchProps): JSX.Element;

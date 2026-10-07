import * as React from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  /** Right-aligned footer, usually Buttons. */
  footer?: React.ReactNode;
  width?: number;
  style?: React.CSSProperties;
}

/** Modal dialog — ink scrim, flat white panel, serif title. */
export function Dialog(props: DialogProps): JSX.Element | null;

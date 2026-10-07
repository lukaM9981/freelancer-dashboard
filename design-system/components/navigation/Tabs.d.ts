import * as React from "react";

export interface TabItem { label: string; value: string; }
export interface TabsProps {
  tabs: TabItem[];
  /** Controlled active value. */
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** Panel content, or a render function receiving the active value. */
  children?: React.ReactNode | ((active: string) => React.ReactNode);
  style?: React.CSSProperties;
}

/**
 * Underline tabs — the active tab carries a brand-yellow rule.
 * @startingPoint section="Navigation" subtitle="Underline tabs" viewport="700x120"
 */
export function Tabs(props: TabsProps): JSX.Element;

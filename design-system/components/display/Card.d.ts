import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** default/bordered = hairline border; elevated = soft shadow; accent = yellow case-study frame; inverse = ink panel; subtle = sunken well. */
  variant?: "default" | "bordered" | "elevated" | "accent" | "subtle" | "inverse";
  padding?: string;
  children?: React.ReactNode;
}

/**
 * Flat content card — white fill with a hairline border or soft warm shadow.
 * Never both heavy. 16px radius, 24px padding by default.
 *
 * @startingPoint section="Display" subtitle="Content card, 6 variants" viewport="700x200"
 */
export function Card(props: CardProps): JSX.Element;

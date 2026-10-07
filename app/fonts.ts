import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";

/** Satoshi: body, UI, numbers. Variable font, weights 300 to 900. */
export const satoshi = localFont({
  src: "./fonts/Satoshi-Variable.woff2",
  weight: "300 900",
  style: "normal",
  display: "swap",
  variable: "--font-satoshi",
});

/** Wulkan Display: headings and primary/secondary button labels. Bold master only. */
export const wulkan = localFont({
  src: "./fonts/WulkanDisplay-Bold.woff2",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-wulkan",
});

/** JetBrains Mono: timer clock, IDs, timestamps, code. */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

/** Put on <html className={fontVariables}> in app/layout.tsx. */
export const fontVariables = `${satoshi.variable} ${wulkan.variable} ${jetbrainsMono.variable}`;

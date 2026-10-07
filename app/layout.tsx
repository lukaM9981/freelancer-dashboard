import type { Metadata } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Olifant Workboard",
  description: "Tasks, estimates, and time for Olifant Digital and its freelancers.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={fontVariables}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}

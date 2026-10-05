import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "SMART ESCAPE", description: "Interactive evacuation route simulator" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

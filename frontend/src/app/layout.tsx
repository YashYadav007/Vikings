import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DevContext OS",
  description: "Memory-powered AI coding workspace for persistent project brains.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

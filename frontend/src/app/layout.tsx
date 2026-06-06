import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vikings",
  description: "Vikings — a memory-powered AI coding agent that builds persistent Vikings Brains.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

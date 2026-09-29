import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Re-shoot a video · Comfy guide",
  description: "Analyze video depth, aim a camera, and run a Comfy workflow.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

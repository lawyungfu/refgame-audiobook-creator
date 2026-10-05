import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RefGame Audiobook Creator",
  description: "Create professional audiobooks with text highlighting, voice recording, and export. Built as an income-generating automation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

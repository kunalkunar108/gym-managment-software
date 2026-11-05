import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GymDesk — Gym Management",
  description: "A simple, powerful workspace for managing your gym."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./auth-gate";

export const metadata: Metadata = {
  title: "GymDesk — Gym Management",
  description: "A simple, powerful workspace for managing your gym."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}

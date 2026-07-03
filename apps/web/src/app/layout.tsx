import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anamnesis | Graph Memory Medical Assistant",
  description: "Hackathon MVP doctor dashboard for continuity of care with Cognee graph memory.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

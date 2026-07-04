"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const navItems = [
  ["1", "Home", "/"],
  ["2", "Patient Dashboard", "/patient"],
  ["3", "Session Processing", "/process"],
  ["4", "Patient Timeline", "/timeline"],
  ["5", "Pre-Session Brief", "/brief"],
  ["6", "Medication Safety", "/safety"],
  ["7", "Memory Graph", "/graph"],
  ["8", "Medical Intuition", "/improve"],
  ["9", "GDPR Forget", "/forget"],
  ["10", "Demo Seed Data", "/seed"],
  ["11", "Doctor Handover", "/handover"],
  ["12", "System Status", "/status"],
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app">
      <nav className="nav" aria-label="Anamnesis pages">
        <div className="brand">
          Anamnesis
          <small>Medical memory system · Cognee hackathon MVP</small>
        </div>
        <ol>
          {navItems.map(([num, label, href]) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link className={`link ${active ? "active" : ""}`} href={href}>
                  <span className="num">{num}</span>
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import AppNav from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRAMAAN - Skill Verification & Team Discovery",
  description: "Proof-over-claims skill verification engine with AI-generated assessments, proctoring violation detection, and hackathon team discovery.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground flex flex-col selection:bg-stone-200">
        <header className="sticky top-0 z-30 border-b border-stone-200/90 bg-[#fbfbfa]/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
            <Link
              href="/"
              className="group flex items-center gap-2.5 transition"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-900 text-stone-50 shadow-xs transition group-hover:bg-stone-800">
                <span className="font-mono text-sm font-bold tracking-tight">P</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-[0.14em] text-stone-900 leading-none">
                  PRAMAAN
                </span>
                <span className="text-[10px] font-medium tracking-widest text-stone-500 uppercase mt-0.5">
                  Proof Engine
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-3">
              <AppNav />
              <Link
                href="/assessments"
                className="hidden lg:inline-flex items-center justify-center rounded-lg border border-stone-900 bg-stone-900 px-3.5 py-1.5 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition"
              >
                Verify Skill
              </Link>
            </div>
          </div>
        </header>

        <div className="flex-1">
          {children}
        </div>

        <footer className="border-t border-stone-200 bg-white/60 py-8 text-xs text-stone-500">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block" />
              <span className="font-medium text-stone-700">PRAMAAN Protocol</span>
              <span>· Proof over claims verification engine</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-stone-500">
              <Link href="/dashboard" className="hover:text-stone-900 transition">Dashboard</Link>
              <Link href="/skills" className="hover:text-stone-900 transition">Skills</Link>
              <Link href="/teammates" className="hover:text-stone-900 transition">Matchmaking</Link>
              <Link href="/assessments" className="hover:text-stone-900 transition">Assessments</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

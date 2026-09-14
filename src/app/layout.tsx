import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import AppNav from "@/components/app-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "PRAMAAN",
  description: "Skill verification and trusted hackathon team discovery",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-full flex-col">
          <header className="border-b border-stone-300">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/"
                className="text-sm font-semibold tracking-[0.14em] text-stone-900"
              >
                PRAMAAN
              </Link>
              <AppNav />
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

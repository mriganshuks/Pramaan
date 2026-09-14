"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Award, 
  FileCheck2, 
  Users, 
  UserCheck, 
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

const navigation = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/skills", label: "Skills", icon: Award },
  { href: "/assessments", label: "Assessments", icon: FileCheck2 },
  { href: "/teammates", label: "Find Teammates", icon: Users },
  { href: "/team", label: "My Team", icon: UserCheck },
  { href: "/profile", label: "Profile", icon: ShieldCheck },
];

export default function AppNav() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop navigation */}
      <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "bg-stone-900 text-stone-50 shadow-xs"
                  : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? "text-stone-200" : "text-stone-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Mobile hamburger button */}
      <div className="flex md:hidden items-center">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="inline-flex items-center justify-center rounded-md p-2 text-stone-700 hover:bg-stone-100 focus:outline-hidden"
          aria-expanded={mobileMenuOpen}
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="absolute top-16 left-0 right-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md px-6 py-4 shadow-lg md:hidden">
          <ul className="flex flex-col gap-1.5">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? "bg-stone-900 text-stone-50"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-stone-200" : "text-stone-400"}`} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}

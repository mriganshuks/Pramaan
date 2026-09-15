"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Award, 
  FileCheck2, 
  Users, 
  UserCheck, 
  ShieldCheck,
  Menu,
  X,
  LogOut,
  LogIn,
  User
} from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authState, setAuthState] = useState<{
    loaded: boolean;
    authenticated: boolean;
    name?: string;
  }>({ loaded: false, authenticated: false });

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        setAuthState({
          loaded: true,
          authenticated: Boolean(data.authenticated),
          name: data.profile?.displayName || data.user?.name || data.user?.email?.split("@")[0],
        });
      })
      .catch(() => {
        if (active) setAuthState({ loaded: true, authenticated: false });
      });
    return () => {
      active = false;
    };
  }, [pathname]);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
    } finally {
      setAuthState({ loaded: true, authenticated: false });
      router.push("/login");
      router.refresh();
    }
  }

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

        {/* Auth status indicator / button */}
        {authState.loaded && (
          <div className="ml-2 pl-2 border-l border-stone-200 flex items-center gap-1.5">
            {authState.authenticated ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
                  <User className="h-3 w-3 text-stone-500" />
                  <span className="max-w-[90px] truncate">{authState.name || "Candidate"}</span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Sign out"
                  className="rounded-lg p-1 text-stone-500 hover:bg-stone-100 hover:text-rose-600 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-2.5 py-1 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
              >
                <LogIn className="h-3 w-3 text-stone-500" />
                <span>Sign In</span>
              </Link>
            )}
          </div>
        )}
      </nav>

      {/* Mobile hamburger button */}
      <div className="flex md:hidden items-center gap-2">
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

            {/* Mobile Auth button */}
            <li className="pt-2 mt-2 border-t border-stone-200">
              {authState.authenticated ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    void handleLogout();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 transition"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out ({authState.name || "Candidate"})</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex w-full items-center gap-2.5 rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-medium text-stone-50"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Sign In to PRAMAAN</span>
                </Link>
              )}
            </li>
          </ul>
        </div>
      )}
    </>
  );
}

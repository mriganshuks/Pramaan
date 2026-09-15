"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Mail, 
  User, 
  AtSign, 
  Briefcase, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  LogOut,
  Sparkles
} from "lucide-react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

interface AuthUser {
  id: string;
  email?: string;
  name?: string;
}

interface AuthStatusResponse {
  authenticated: boolean;
  hasProfile: boolean;
  profile?: {
    id: string;
    displayName: string;
    handle: string;
    email: string;
  } | null;
  user?: AuthUser | null;
  supabaseUser?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
      avatar_url?: string;
    };
  } | null;
}

interface Props {
  initialMode?: "signin" | "signup" | "profile";
}

export default function AuthOnboardingClient({ initialMode = "signin" }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/dashboard";

  // Auth Modes: 'signin' | 'signup' | 'forgot' | 'profile'
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "profile">(
    initialMode === "profile" ? "profile" : initialMode
  );

  // States
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Authenticated Supabase User (if logged in)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  // Form Fields for Sign In / Sign Up
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authConfirmPassword, setAuthConfirmPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");

  // Form Fields for Profile Creation
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileHandle, setProfileHandle] = useState("");
  const [profileHeadline, setProfileHeadline] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [profileBio, setProfileBio] = useState("");

  const configured = isSupabaseConfigured();

  // Check auth session on load
  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) throw new Error("Failed to check auth state");
        const data: AuthStatusResponse = await res.json();

        if (!active) return;

        if (data.authenticated && data.hasProfile) {
          // Already fully onboarded!
          router.replace(nextUrl);
          return;
        }

        if (data.authenticated && !data.hasProfile) {
          // Authenticated with Supabase, but needs to create a Pramaan profile
          const email = data.user?.email || data.supabaseUser?.email || "";
          const name =
            data.user?.name ||
            data.supabaseUser?.user_metadata?.full_name ||
            data.supabaseUser?.user_metadata?.name ||
            email.split("@")[0] ||
            "";

          setAuthUser({
            id: data.user?.id || data.supabaseUser?.id || "",
            email,
            name,
          });

          setProfileDisplayName(name);
          // Generate an initial handle suggestion
          const baseHandle = (email.split("@")[0] || name || "candidate")
            .toLowerCase()
            .replace(/[^a-z0-9_]/g, "_")
            .slice(0, 20);
          setProfileHandle(baseHandle);
          setMode("profile");
        }
      } catch (err) {
        console.warn("Session check fallback:", err);
      } finally {
        if (active) setCheckingAuth(false);
      }
    }

    void checkSession();

    // Listen to client-side Supabase auth state changes if client configured
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          if (!active) return;
          if (event === "SIGNED_IN" && session?.user) {
            const user = session.user;
            const res = await fetch("/api/auth/me");
            const data: AuthStatusResponse = await res.json();
            if (data.authenticated && data.hasProfile) {
              router.replace(nextUrl);
            } else {
              setAuthUser({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
              });
              setProfileDisplayName(
                user.user_metadata?.full_name || user.email?.split("@")[0] || ""
              );
              setMode("profile");
            }
          } else if (event === "SIGNED_OUT") {
            setAuthUser(null);
            setMode("signin");
          }
        }
      );

      return () => {
        active = false;
        authListener.subscription.unsubscribe();
      };
    }

    return () => {
      active = false;
    };
  }, [nextUrl, router]);

  // Handle Email + Password Sign In
  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(
          "Supabase Auth is not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        );
      }

      const { data, error: signInErr } = await supabase.auth.signInWithPassword({
        email: authEmail.trim(),
        password: authPassword,
      });

      if (signInErr) {
        throw signInErr;
      }

      if (data.user) {
        // Query server to check if profile exists
        const meRes = await fetch("/api/auth/me");
        const meData: AuthStatusResponse = await meRes.json();

        if (meData.authenticated && meData.hasProfile) {
          router.push(nextUrl);
          router.refresh();
        } else {
          setAuthUser({
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "",
          });
          setProfileDisplayName(
            data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || ""
          );
          setMode("profile");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Email + Password Sign Up
  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    if (authPassword !== authConfirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    if (authPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(
          "Supabase Auth is not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        );
      }

      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: authEmail.trim(),
        password: authPassword,
        options: {
          data: {
            full_name: authFullName.trim(),
            name: authFullName.trim(),
          },
        },
      });

      if (signUpErr) {
        throw signUpErr;
      }

      if (data.user) {
        if (data.session) {
          // Immediately logged in
          setAuthUser({
            id: data.user.id,
            email: data.user.email,
            name: authFullName.trim() || data.user.email?.split("@")[0] || "",
          });
          setProfileDisplayName(authFullName.trim() || data.user.email?.split("@")[0] || "");
          setMode("profile");
        } else {
          // Confirmation email required
          setSuccessNotice(
            `Confirmation link sent to ${authEmail}. Please check your inbox and verify your email to continue.`
          );
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Password Reset Request
  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);
    setSubmitting(true);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error("Supabase Auth is not configured.");
      }

      const redirectTo = `${window.location.origin}/login`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(
        authEmail.trim(),
        { redirectTo }
      );

      if (resetErr) {
        throw resetErr;
      }

      setSuccessNotice(
        `If an account exists for ${authEmail}, a password reset link has been dispatched.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle OAuth Sign In (Google / GitHub)
  async function handleOAuth(provider: "google" | "github") {
    setOauthLoading(provider);
    setError(null);
    setSuccessNotice(null);

    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error(
          "Supabase Auth is not configured. Please define NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
        );
      }

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextUrl)}`;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: provider === "google" ? { access_type: "offline", prompt: "consent" } : undefined,
        },
      });

      if (oauthErr) {
        throw oauthErr;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : `Failed to initiate ${provider} authentication.`);
      setOauthLoading(null);
    }
  }

  // Handle Profile Creation (Step 2)
  async function handleCreateProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const cleanHandle = profileHandle.trim().toLowerCase();
    const handleRegex = /^[a-z0-9_]{3,32}$/;

    if (!handleRegex.test(cleanHandle)) {
      setError("Handle must be 3–32 characters using only lowercase letters, numbers, or underscores.");
      setSubmitting(false);
      return;
    }

    try {
      // Pass the Bearer token in header if available from Supabase session
      const supabase = getSupabaseBrowserClient();
      let authHeader: Record<string, string> = {};
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          authHeader = { Authorization: `Bearer ${data.session.access_token}` };
        }
      }

      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          displayName: profileDisplayName.trim(),
          email: authUser?.email || authEmail.trim(),
          handle: cleanHandle,
          headline: profileHeadline.trim(),
          location: profileLocation.trim(),
          bio: profileBio.trim(),
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error?.message ?? "Unable to create profile.");
      }

      // Profile created! Redirect to candidate dashboard
      router.push(nextUrl);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to create profile.");
    } finally {
      setSubmitting(false);
    }
  }

  // Handle Sign Out from Profile Creation
  async function handleSignOut() {
    setSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      setAuthUser(null);
      setMode("signin");
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingAuth) {
    return (
      <main className="mx-auto flex min-h-[70vh] w-full max-w-md items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-stone-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-900 border-t-transparent" />
          <span className="text-xs font-mono">Verifying authentication session...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[75vh] w-full max-w-lg flex-col items-center justify-center px-4 py-12 sm:py-16">
      {/* Brand Header */}
      <div className="w-full text-center mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 shadow-xs mb-3">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
          {mode === "profile"
            ? "Complete Candidate Profile"
            : mode === "signup"
            ? "Create PRAMAAN Account"
            : mode === "forgot"
            ? "Reset Your Password"
            : "Sign In to PRAMAAN"}
        </h1>
        <p className="mt-1.5 text-xs text-stone-600 max-w-sm mx-auto">
          {mode === "profile"
            ? "Final step: set up your verified skill passport and technical portfolio."
            : "Cryptographic proof-over-claims verification engine & hackathon team discovery."}
        </p>
      </div>

      {/* Main Form Container */}
      <div className="w-full rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
        {/* Unconfigured Alert */}
        {!configured && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <p className="font-semibold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
              Supabase Configuration Notice
            </p>
            <p className="mt-1 text-amber-800 leading-relaxed">
              Define <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in your environment variables to enable production Supabase Auth.
            </p>
          </div>
        )}

        {/* Global Error Alert */}
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Global Success Alert */}
        {successNotice && (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{successNotice}</span>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 1: SIGN IN / SIGN UP TABS                                */}
        {/* ============================================================ */}
        {mode !== "profile" && mode !== "forgot" && (
          <div>
            {/* Segmented Tab Switcher */}
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1 mb-6 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccessNotice(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "signin"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                  setSuccessNotice(null);
                }}
                className={`rounded-lg py-2 transition ${
                  mode === "signup"
                    ? "bg-white text-stone-900 shadow-xs"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleOAuth("google")}
                disabled={Boolean(oauthLoading) || submitting}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    fill="#EA4335"
                  />
                </svg>
                <span>
                  {oauthLoading === "google"
                    ? "Connecting to Google..."
                    : "Continue with Google"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleOAuth("github")}
                disabled={Boolean(oauthLoading) || submitting}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>
                  {oauthLoading === "github"
                    ? "Connecting to GitHub..."
                    : "Continue with GitHub"}
                </span>
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white px-2 font-mono text-stone-400">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Form */}
            {mode === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-stone-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] font-medium text-stone-600 hover:text-stone-900 hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-10 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
                >
                  <span>{submitting ? "Signing in..." : "Sign In"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Password (min 6 characters)
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-10 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={authConfirmPassword}
                      onChange={(e) => setAuthConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
                >
                  <span>{submitting ? "Creating account..." : "Create Account & Continue"}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: FORGOT PASSWORD                                      */}
        {/* ============================================================ */}
        {mode === "forgot" && (
          <div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Account Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
              >
                <span>{submitting ? "Sending reset link..." : "Send Password Reset Link"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                  setSuccessNotice(null);
                }}
                className="w-full text-center text-xs font-medium text-stone-600 hover:text-stone-900 hover:underline pt-2"
              >
                ← Return to Sign In
              </button>
            </form>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 3: PROFILE CREATION (STEP 2)                            */}
        {/* ============================================================ */}
        {mode === "profile" && (
          <div>
            {/* Authenticated identity pill */}
            <div className="mb-5 flex items-center justify-between rounded-xl border border-stone-200 bg-stone-50/80 p-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  ✓
                </div>
                <div>
                  <div className="font-semibold text-stone-900 flex items-center gap-1.5">
                    <span>Authenticated Identity</span>
                    <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200 uppercase">
                      Supabase Verified
                    </span>
                  </div>
                  <p className="text-stone-500 font-mono text-[11px]">
                    {authUser?.email || authEmail || "Logged in"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={submitting}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-rose-600 transition"
                title="Switch account"
              >
                <LogOut className="h-3 w-3" />
                <span>Switch</span>
              </button>
            </div>

            <form onSubmit={handleCreateProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={profileDisplayName}
                    onChange={(e) => setProfileDisplayName(e.target.value)}
                    placeholder="Alex Rivera"
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Public Handle <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    pattern="[a-z0-9_]{3,32}"
                    value={profileHandle}
                    onChange={(e) => setProfileHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="alex_rivera"
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Your public passport address: /passport/<strong>{profileHandle || "handle"}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Headline / Role
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    maxLength={120}
                    value={profileHeadline}
                    onChange={(e) => setProfileHeadline(e.target.value)}
                    placeholder="Full-Stack Engineer & AI Researcher"
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Location (optional)
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    maxLength={100}
                    value={profileLocation}
                    onChange={(e) => setProfileLocation(e.target.value)}
                    placeholder="Bengaluru, India"
                    className="h-10 w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                  Bio (optional)
                </label>
                <textarea
                  rows={2}
                  maxLength={1200}
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  placeholder="Specializing in scalable distributed systems and cryptographic proof protocols..."
                  className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-900 placeholder:text-stone-400 focus:border-stone-900 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50 mt-2"
              >
                <Sparkles className="h-4 w-4" />
                <span>{submitting ? "Creating verified profile..." : "Complete Profile & Launch PRAMAAN"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-6 text-center text-[11px] text-stone-500">
        <span>Protected by Supabase Auth and PRAMAAN Protocol</span>
        <span className="mx-2">·</span>
        <Link href="/" className="hover:text-stone-800 hover:underline">
          Return to Home
        </Link>
      </div>
    </main>
  );
}

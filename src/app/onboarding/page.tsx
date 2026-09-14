"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: form.get("displayName"), email: form.get("email"), handle: form.get("handle"), headline: form.get("headline"), location: form.get("location") }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to create profile.");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to create profile.");
    } finally {
      setSaving(false);
    }
  }

  return <main className="mx-auto flex w-full max-w-xl flex-col px-6 py-14"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Start with a profile</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Create your local PRAMAAN profile</h1><p className="mt-3 text-sm leading-6 text-stone-600">PRAMAAN currently has no login. This browser will keep a local profile reference; do not treat it as verified identity.</p><form onSubmit={submit} className="mt-10 grid gap-5 border-t border-stone-300 pt-8"><label className="grid gap-2 text-sm font-medium">Name<input name="displayName" required minLength={2} className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm font-medium">Email<input name="email" type="email" required className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm font-medium">Public handle<input name="handle" required pattern="[a-z0-9_]{3,32}" placeholder="lowercase_handle" className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm font-medium">Headline optional<input name="headline" className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm font-medium">Location optional<input name="location" className="h-11 border border-stone-300 bg-white px-3" /></label>{error && <p className="text-sm text-red-700">{error}</p>}<button disabled={saving} className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 disabled:opacity-50">{saving ? "Creating profile…" : "Create profile"}</button></form></main>;
}

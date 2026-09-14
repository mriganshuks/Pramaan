"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  ArrowRight, 
  ExternalLink,
  ShieldCheck,
  FileCode2,
  Sparkles
} from "lucide-react";
import { StatusBadge } from "@/components/ui-shared";

type Skill = {
  name: string;
  status: string;
  assessmentScore?: number;
  evidenceCount: number;
};

type Profile = {
  skills: Skill[];
};

const POPULAR_SKILLS = [
  "TypeScript",
  "React",
  "Python",
  "Node.js",
  "PostgreSQL",
  "Go",
  "Rust",
  "Next.js",
  "Docker",
  "MongoDB",
];

export default function SkillsClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [skillInput, setSkillInput] = useState("");
  const [filter, setFilter] = useState<"ALL" | "VERIFIED" | "PENDING">("ALL");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/profile");
        const body = await response.json();
        if (!active) return;
        if (!response.ok) throw new Error(body.error?.message ?? "Unable to load skills.");
        setProfile(body.profile as Profile);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load skills.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!skillInput.trim()) return;
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: skillInput.trim() }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Unable to add skill.");
        return;
      }
      setProfile(body.profile);
      setSkillInput("");
      setNotice(`"${skillInput.trim()}" added to your claimed skills.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add skill.");
    }
  }

  async function quickAdd(name: string) {
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/profile/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Unable to add skill.");
        return;
      }
      setProfile(body.profile);
      setNotice(`"${name}" added to your claimed skills.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add skill.");
    }
  }

  async function remove(name: string) {
    if (!confirm(`Remove "${name}" from your skills?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/profile/skills?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Unable to remove skill.");
        return;
      }
      setProfile(body.profile);
      setNotice(`Removed "${name}".`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to remove skill.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-stone-200" />
          <div className="h-20 rounded-xl bg-stone-100 border border-stone-200" />
          <div className="h-64 rounded-xl bg-stone-100 border border-stone-200" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="font-semibold">Unable to load skills</p>
          <p className="mt-1 text-sm">{error ?? "Create your profile before managing skills."}</p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex h-9 items-center rounded-lg bg-red-900 px-4 text-xs font-semibold text-white"
          >
            Create Profile
          </Link>
        </div>
      </main>
    );
  }

  const verified = profile.skills.filter((s) => s.status === "VERIFIED");
  const partial = profile.skills.filter((s) => s.status === "PARTIALLY_VERIFIED");
  const pending = profile.skills.filter((s) => s.status === "CLAIMED" || s.status === "NOT_VERIFIED");

  const filteredSkills = profile.skills.filter((s) => {
    if (filter === "VERIFIED") return s.status === "VERIFIED";
    if (filter === "PENDING") return s.status !== "VERIFIED";
    return true;
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
          SKILL INVENTORY
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          Technical Skills & Proof
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Claims remain unverified until supported by benchmark assessments or verifiable code evidence.
        </p>
      </div>

      {notice && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          {notice}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          {error}
        </div>
      )}

      {/* Add Skill Form & Suggestions */}
      <section className="mt-8 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-stone-900">Add a Technical Skill</h2>
        <form onSubmit={add} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="skill-name"
            name="name"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            required
            minLength={2}
            placeholder="e.g. TypeScript, React, Go, PostgreSQL"
            className="h-11 flex-1 rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-900"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-sm font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Skill</span>
          </button>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">Quick add:</span>
          {POPULAR_SKILLS.filter(
            (s) => !profile.skills.some((ps) => ps.name.toLowerCase() === s.toLowerCase())
          )
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void quickAdd(s)}
                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-medium text-stone-700 hover:border-stone-400 hover:bg-stone-100 transition"
              >
                <Plus className="h-3 w-3 text-stone-400" />
                <span>{s}</span>
              </button>
            ))}
        </div>
      </section>

      {/* Filters & Skill List */}
      <section className="mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-stone-900 text-stone-50"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              All Skills ({profile.skills.length})
            </button>
            <button
              onClick={() => setFilter("VERIFIED")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "VERIFIED"
                  ? "bg-stone-900 text-stone-50"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Verified ({verified.length})
            </button>
            <button
              onClick={() => setFilter("PENDING")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "PENDING"
                  ? "bg-stone-900 text-stone-50"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              Pending ({partial.length + pending.length})
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {filteredSkills.map((skill) => (
            <div
              key={skill.name}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs transition hover:border-stone-300 gap-4"
            >
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-800 font-mono text-xs font-bold shrink-0">
                  {skill.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-base font-bold text-stone-900">{skill.name}</span>
                    <StatusBadge status={skill.status} />
                  </div>
                  <p className="text-xs text-stone-500 mt-1">
                    {skill.evidenceCount ? `${skill.evidenceCount} external evidence links` : "No external links attached"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5">
                <div className="text-right">
                  <span className="text-[11px] font-medium text-stone-500 uppercase tracking-wider block">
                    Benchmark
                  </span>
                  <span className="text-base font-bold text-stone-900">
                    {skill.assessmentScore !== undefined ? `${skill.assessmentScore}%` : "—"}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/assessments/${encodeURIComponent(skill.name)}?difficulty=intermediate`}
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-stone-900 bg-stone-900 px-3.5 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
                  >
                    {skill.assessmentScore !== undefined ? "Retest" : "Verify Skill"}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void remove(skill.name)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition"
                    title={`Delete ${skill.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          {filteredSkills.length === 0 && (
            <div className="rounded-xl border border-dashed border-stone-300 py-12 text-center">
              <p className="text-sm text-stone-500">No skills match the current filter.</p>
            </div>
          )}
        </div>
      </section>

      {/* Educational Guide */}
      <section className="mt-12 rounded-2xl border border-stone-200 bg-stone-50/70 p-6 text-stone-800">
        <h3 className="font-bold text-sm text-stone-900">The PRAMAAN Verification Hierarchy</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-3 text-xs leading-relaxed text-stone-600">
          <div>
            <span className="font-semibold text-stone-900 block">1. Self-Claimed</span>
            Claiming a skill registers your interest. It does not carry credential weight on matchmaking boards.
          </div>
          <div>
            <span className="font-semibold text-stone-900 block">2. Partially Verified</span>
            Attaching external links (GitHub repos, LeetCode, competitions) or scoring 60–79% on benchmarks.
          </div>
          <div>
            <span className="font-semibold text-emerald-800 block">3. Full Verification</span>
            Scoring 80%+ on proctored AI assessments with verified low risk and tamper-evident audit receipts.
          </div>
        </div>
      </section>
    </main>
  );
}

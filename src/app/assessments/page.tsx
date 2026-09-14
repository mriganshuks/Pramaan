"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { 
  Cpu, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Code2, 
  Camera, 
  Sparkles,
  Award
} from "lucide-react";
import { StatusBadge } from "@/components/ui-shared";

type Profile = {
  skills: Array<{ name: string; status: string; assessmentScore?: number }>;
};

const SUGGESTED_ASSESSMENTS = [
  { skill: "JavaScript", level: "intermediate", desc: "Closures, event loops, async/await, prototypes & modern ES6+ standards." },
  { skill: "TypeScript", level: "intermediate", desc: "Generics, utility types, narrowing, interfaces and structural typing." },
  { skill: "React", level: "intermediate", desc: "Hooks lifecycle, memoization, state management, concurrent rendering." },
  { skill: "Python", level: "intermediate", desc: "Data models, generators, decorators, memory management & asyncio." },
  { skill: "PostgreSQL", level: "intermediate", desc: "Indexes, transactions, normalization, joins & query plan optimization." },
  { skill: "Go", level: "intermediate", desc: "Goroutines, channels, interfaces, memory allocation & error handling." },
];

export default function AssessmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState("JavaScript");
  const [difficulty, setDifficulty] = useState("intermediate");

  useEffect(() => {
    void fetch("/api/profile")
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message ?? "Unable to load skills.");
        setProfile(body.profile);
        if (body.profile.skills[0]?.name) {
          setSkill(body.profile.skills[0].name);
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load assessments.");
      });
  }, []);

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = skill.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) return;
    router.push(`/assessments/${encodeURIComponent(normalized)}?difficulty=${difficulty}`);
  }

  const userSkills = profile?.skills ?? [];

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
          EVALUATION SUITE
        </span>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
          Proctored Skill Assessments
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Dynamically synthesized technical evaluations powered by OpenAI. Private answer keys,
          browser-local face presence proctoring, and tamper-evident verification receipts.
        </p>
      </div>

      {/* Main Grid: Custom Launcher + Proctoring Preflight Checklist */}
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Custom Assessment Launch Form */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Cpu className="h-5 w-5 text-stone-700" />
              <h2 className="text-base font-bold text-stone-900">Launch Custom Benchmark</h2>
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Technology / Skill Name
                </label>
                <input
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  minLength={2}
                  maxLength={80}
                  required
                  placeholder="e.g. JavaScript, Rust, Docker, PyTorch"
                  className="h-11 w-full rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 focus:border-stone-900"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Evaluation Difficulty
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900"
                  >
                    <option value="beginner">Beginner (Core Syntax & Concepts)</option>
                    <option value="intermediate">Intermediate (Production Patterns & APIs)</option>
                    <option value="advanced">Advanced (Internals, Concurrency & Optimization)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">
                    Format & Duration
                  </label>
                  <div className="flex h-11 items-center rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs text-stone-600">
                    <Clock className="h-4 w-4 mr-2 text-stone-400" />
                    <span>5 MCQs + 1 Code Challenge (28 min)</span>
                  </div>
                </div>
              </div>

              {userSkills.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-stone-500 font-medium block mb-2">
                    Quick select from your claimed skills:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {userSkills.map((sk) => (
                      <button
                        key={sk.name}
                        type="button"
                        onClick={() => setSkill(sk.name)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          skill.toLowerCase() === sk.name.toLowerCase()
                            ? "border-stone-900 bg-stone-900 text-stone-50"
                            : "border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {sk.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-sm font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition"
              >
                <span>Initialize Assessment Session</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Proctoring Preflight Checklist Card */}
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="text-base font-bold text-stone-900">Proctoring Requirements</h2>
          </div>

          <div className="mt-4 space-y-3.5 text-xs text-stone-600">
            <div className="flex items-start gap-2.5">
              <Camera className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">Webcam Access</span>
                On-device face presence model monitors focus. Zero video is recorded or sent to servers.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">Server-Enforced Timer</span>
                28 minutes strictly counted on the server to prevent browser client tampering.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Code2 className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">Isolated Code Evaluation</span>
                Client submissions are analyzed securely without exposing answer keys or test suites.
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-stone-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-stone-900 block">3-Strike Integrity Lock</span>
                Repeated tab switching or prolonged absence results in automated unverified termination.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Curricula */}
      <section className="mt-12">
        <h2 className="text-base font-bold text-stone-900">Standard Benchmarks</h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Select a standard curriculum benchmark to verify foundational and production ability.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SUGGESTED_ASSESSMENTS.map((item) => (
            <div
              key={item.skill}
              className="flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-5 shadow-xs transition hover:border-stone-300"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-stone-900">{item.skill}</h3>
                  <span className="rounded bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-600 capitalize">
                    {item.level}
                  </span>
                </div>
                <p className="mt-2 text-xs text-stone-600 leading-relaxed">{item.desc}</p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-stone-100 pt-3">
                <span className="text-[11px] text-stone-500 font-mono">28 min · 6 questions</span>
                <Link
                  href={`/assessments/${encodeURIComponent(item.skill)}?difficulty=${item.level}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-900 bg-stone-900 px-3 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
                >
                  <span>Start</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

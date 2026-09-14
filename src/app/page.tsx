import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  Cpu, 
  Lock, 
  Users, 
  CheckCircle2, 
  Award, 
  Sparkles,
  Search,
  Fingerprint
} from "lucide-react";
import { StatusBadge } from "@/components/ui-shared";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero Section */}
      <section className="flex flex-col items-start max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-300/80 bg-stone-100/80 px-3 py-1 text-xs font-medium text-stone-700 backdrop-blur-xs">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Proof Over Claims Protocol</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">v1.2 Production</span>
        </div>

        <h1 className="mt-6 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl sm:leading-[1.15]">
          Stop guessing talent. <br className="hidden sm:inline" />
          <span className="text-stone-600 font-medium">Verify actual skills with cryptographic proof.</span>
        </h1>

        <p className="mt-5 text-base leading-relaxed text-stone-600 sm:text-lg max-w-2xl">
          PRAMAAN turns self-reported skill claims into evidence-backed digital credentials.
          Powered by adaptive AI technical evaluations, server-enforced proctoring integrity,
          and skill-gap team matchmaking for competitive hackathons.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-5 text-sm font-semibold text-stone-50 shadow-sm hover:bg-stone-800 transition"
          >
            <span>Open Candidate Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/teammates"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition"
          >
            <Users className="h-4 w-4 text-stone-500" />
            <span>Find Hackathon Teammates</span>
          </Link>
          <Link
            href="/assessments"
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-transparent px-4 text-sm font-medium text-stone-600 hover:text-stone-900 transition"
          >
            <Cpu className="h-4 w-4" />
            <span>Launch Evaluation</span>
          </Link>
        </div>
      </section>

      {/* Live Verified Credential Preview Card */}
      <section className="mt-14 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-6">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-900 text-stone-50 font-mono font-bold text-lg">
              JS
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-stone-900">Alex Rivera</h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  VERIFIED PASSPORT
                </span>
              </div>
              <p className="text-xs text-stone-500 font-mono mt-0.5">ID: PRM-9482-771B · Full-Stack Systems Engineer</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-stone-600 bg-stone-50 p-2.5 rounded-lg border border-stone-200/60">
            <div>
              <span className="text-stone-400 block text-[10px]">INTEGRITY INDEX</span>
              <span className="font-semibold text-emerald-700">98/100 (LOW RISK)</span>
            </div>
            <div className="h-6 w-px bg-stone-200" />
            <div>
              <span className="text-stone-400 block text-[10px]">VERIFIED SKILLS</span>
              <span className="font-semibold text-stone-900">4 OF 4 PASSED</span>
            </div>
          </div>
        </div>

        {/* Verified skills grid sample */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 transition hover:bg-stone-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 text-sm">TypeScript</span>
              <StatusBadge status="VERIFIED" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Benchmark Score</span>
              <span className="text-sm font-bold text-stone-900">92%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 transition hover:bg-stone-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 text-sm">React & Next.js</span>
              <StatusBadge status="VERIFIED" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Benchmark Score</span>
              <span className="text-sm font-bold text-stone-900">88%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[88%]" />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 transition hover:bg-stone-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 text-sm">PostgreSQL</span>
              <StatusBadge status="VERIFIED" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Benchmark Score</span>
              <span className="text-sm font-bold text-stone-900">85%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
            </div>
          </div>

          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-4 transition hover:bg-stone-50">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-900 text-sm">Python</span>
              <StatusBadge status="PARTIALLY_VERIFIED" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-stone-500">Benchmark Score</span>
              <span className="text-sm font-bold text-stone-900">74%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-stone-200 overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full w-[74%]" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-4 text-xs text-stone-500 font-mono">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-stone-400" />
            <span>Audit Hash: sha256:d82f7c03...b91a (Tamper-evident record)</span>
          </div>
          <Link
            href="/passport/demo"
            className="font-medium text-stone-900 hover:underline flex items-center gap-1"
          >
            <span>Inspect sample public passport</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </section>

      {/* 3 Core Pillars */}
      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-900">
            <Cpu className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900">AI-Adaptive Evaluations</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Dynamically synthesized questions powered by OpenAI. Private answer keys,
            multi-choice concept probes, and secure coding submissions evaluated without server-side execution risk.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-900">
            <Lock className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900">Server-Authoritative Integrity</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Browser-local face presence detection, tab visibility, and window focus tracking.
            Three-tier escalation policy terminates compromised sessions while preserving candidate privacy.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-100 text-stone-900">
            <Users className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900">Verify-Before-Accept Matchmaking</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            Discover teammates with complementary, verified skills for hackathons.
            Squad leaders issue timed skill challenges to verify capability before confirming roster invitations.
          </p>
        </div>
      </section>

      {/* Workflow Steps */}
      <section className="mt-16 border-t border-stone-200/90 pt-12">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-500">Simple 3-Step Process</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-stone-900">How PRAMAAN Verifies Technical Ability</h2>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <div className="relative border-l-2 border-stone-300 pl-4">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 01</span>
            <h4 className="mt-1 text-base font-semibold text-stone-900">Claim Technical Skills</h4>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Add your claimed languages, frameworks, or databases. Attach supporting links to repositories and problem-solving profiles.
            </p>
          </div>

          <div className="relative border-l-2 border-stone-300 pl-4">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 02</span>
            <h4 className="mt-1 text-base font-semibold text-stone-900">Pass Proctored Benchmark</h4>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Complete timed adaptive assessments with on-device focus tracking. The server issues a tamper-evident verification receipt upon passing.
            </p>
          </div>

          <div className="relative border-l-2 border-stone-300 pl-4">
            <span className="text-xs font-bold text-stone-400 font-mono">STEP 03</span>
            <h4 className="mt-1 text-base font-semibold text-stone-900">Unlock Squad Discovery</h4>
            <p className="mt-2 text-sm text-stone-600 leading-relaxed">
              Share your public Skill Passport with recruiters and match with high-caliber hackathon teams that require your verified skillset.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

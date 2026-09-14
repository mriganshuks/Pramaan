"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  Award, 
  ShieldCheck, 
  Users, 
  ArrowRight, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Plus, 
  FileCode2, 
  Share2,
  Cpu,
  Layers
} from "lucide-react";
import { StatusBadge, StatCard } from "@/components/ui-shared";

type Skill = {
  name: string;
  status: string;
  assessmentScore?: number;
  evidenceCount?: number;
};

type Project = {
  _id?: string;
  title: string;
  description: string;
  url?: string;
  skills: string[];
};

type Evidence = {
  _id?: string;
  source: string;
  url: string;
  description: string;
  skills: string[];
};

type Profile = {
  id: string;
  displayName: string;
  handle: string;
  headline: string;
  bio: string;
  location?: string;
  availableForTeams: boolean;
  skills: Skill[];
  projects?: Project[];
  evidence?: Evidence[];
};

type Team = {
  id: string;
  name: string;
  hackathonName: string;
  requiredSkills: string[];
  members: unknown[];
  capacity: number;
};

export default function DashboardClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const [profileResponse, teamResponse] = await Promise.all([
          fetch("/api/profile"),
          fetch("/api/teams"),
        ]);
        const profileBody = await profileResponse.json();
        const teamBody = await teamResponse.json();

        if (!profileResponse.ok) {
          throw new Error(profileBody.error?.message ?? "Create your profile to open the dashboard.");
        }
        if (!active) return;
        setProfile(profileBody.profile);
        if (teamResponse.ok && teamBody.teams) {
          setTeams(teamBody.teams);
        }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-8">
          <div className="h-10 w-64 rounded-lg bg-stone-200" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-stone-100 border border-stone-200" />
            ))}
          </div>
          <div className="h-64 rounded-xl bg-stone-100 border border-stone-200" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-900 text-stone-50">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight text-stone-900">Welcome to PRAMAAN</h1>
        <p className="mt-2 text-sm text-stone-600 max-w-md">
          {error ?? "Create your local profile to begin claiming skills, completing proctored benchmarks, and discovering teammates."}
        </p>
        <Link
          href="/onboarding"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-6 text-sm font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition"
        >
          <span>Create Local Profile</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  const verifiedSkills = profile.skills.filter((s) => s.status === "VERIFIED");
  const partialSkills = profile.skills.filter((s) => s.status === "PARTIALLY_VERIFIED");
  const totalSkills = profile.skills.length;
  const verifiedCount = verifiedSkills.length;
  
  // Calculate average score of assessed skills
  const scoredSkills = profile.skills.filter((s) => typeof s.assessmentScore === "number");
  const avgScore = scoredSkills.length > 0
    ? Math.round(scoredSkills.reduce((acc, s) => acc + (s.assessmentScore ?? 0), 0) / scoredSkills.length)
    : 0;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Profile Greeting Header */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
              VERIFIED CANDIDATE
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs font-mono text-stone-500">@{profile.handle}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
            Welcome, {profile.displayName}
          </h1>
          <p className="mt-1 text-sm text-stone-600 max-w-2xl">
            {profile.headline || "Evidence-backed profile with AI-evaluated benchmarks and server-proctored integrity."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/passport/${profile.handle}`}
            target="_blank"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3.5 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
          >
            <Share2 className="h-3.5 w-3.5 text-stone-500" />
            <span>Public Passport</span>
            <ExternalLink className="h-3 w-3 text-stone-400" />
          </Link>
          <Link
            href="/assessments"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-stone-900 bg-stone-900 px-4 text-xs font-semibold text-stone-50 shadow-2xs hover:bg-stone-800 transition"
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>Launch Evaluation</span>
          </Link>
        </div>
      </section>

      {/* 4 Key Stat Metrics */}
      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Verified Skills"
          value={`${verifiedCount} / ${totalSkills}`}
          subtext={totalSkills > 0 ? `${Math.round((verifiedCount / totalSkills) * 100)}% verified rate` : "No skills claimed yet"}
          icon={Award}
          badge={
            verifiedCount > 0 ? (
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Active
              </span>
            ) : undefined
          }
        />

        <StatCard
          label="Benchmark Average"
          value={scoredSkills.length > 0 ? `${avgScore}%` : "—"}
          subtext={scoredSkills.length > 0 ? `Across ${scoredSkills.length} completed tests` : "Complete test to benchmark"}
          icon={ShieldCheck}
        />

        <StatCard
          label="Proctoring Integrity"
          value="Optimal"
          subtext="Zero active violation penalties"
          icon={CheckCircle2}
          badge={
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Low Risk
            </span>
          }
        />

        <StatCard
          label="Hackathon Squad"
          value={teams.length > 0 ? teams[0].name : "Open Agent"}
          subtext={teams.length > 0 ? `${teams[0].members.length} of ${teams[0].capacity} seats filled` : "Ready for team discovery"}
          icon={Users}
        />
      </section>

      {/* Main Grid: Skills Matrix & Team / Evidence */}
      <section className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left 2 Cols: Skill Verification Matrix */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-stone-900">Skill Verification Matrix</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Adaptive AI assessments and evidence backing each technical claim.
                </p>
              </div>
              <Link
                href="/skills"
                className="text-xs font-semibold text-stone-900 hover:underline flex items-center gap-1"
              >
                <span>Manage All Skills</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="mt-4 divide-y divide-stone-100">
              {profile.skills.map((skill) => (
                <div
                  key={skill.name}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100 text-stone-800 font-mono text-xs font-bold shrink-0">
                      {skill.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-stone-900">{skill.name}</span>
                        <StatusBadge status={skill.status} />
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {skill.evidenceCount ? `${skill.evidenceCount} evidence links attached` : "Self-claimed skill"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <span className="text-xs text-stone-500 block">Assessment</span>
                      <span className="text-sm font-bold text-stone-900">
                        {skill.assessmentScore !== undefined ? `${skill.assessmentScore}%` : "Pending"}
                      </span>
                    </div>

                    <Link
                      href={`/assessments/${encodeURIComponent(skill.name)}?difficulty=intermediate`}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-800 shadow-2xs hover:bg-stone-50 transition"
                    >
                      {skill.assessmentScore !== undefined ? "Retest" : "Take Test"}
                    </Link>
                  </div>
                </div>
              ))}

              {profile.skills.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm text-stone-500">No skills added yet.</p>
                  <Link
                    href="/skills"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-900 underline underline-offset-4"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add your first technical skill</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Quick Launch Assessment Banner */}
          <div className="rounded-2xl border border-stone-900 bg-stone-950 p-6 text-stone-100 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="rounded-full bg-stone-800 px-2.5 py-0.5 text-[11px] font-mono font-medium text-stone-300">
                  OPENAI ADAPTIVE ENGINE
                </span>
                <h3 className="mt-2 text-lg font-bold text-white">Ready to verify a new technical skill?</h3>
                <p className="mt-1 text-xs text-stone-400 max-w-lg">
                  Launch a 28-minute proctored assessment. Questions are dynamically generated to prevent answer sharing.
                </p>
              </div>
              <Link
                href="/assessments"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-white px-5 text-xs font-bold text-stone-950 shadow-sm hover:bg-stone-100 transition shrink-0"
              >
                Browse Assessments
              </Link>
            </div>
          </div>
        </div>

        {/* Right Col: Team Activity & Evidence Overview */}
        <div className="space-y-6">
          {/* Hackathon Team Card */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
                HACKATHON TEAM
              </span>
              <Link href="/team" className="text-xs font-semibold text-stone-900 hover:underline">
                Manage
              </Link>
            </div>

            {teams.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-stone-900">{teams[0].name}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">{teams[0].hackathonName}</p>
                  </div>
                  <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-mono font-semibold text-stone-700">
                    {teams[0].members.length}/{teams[0].capacity} Seats
                  </span>
                </div>

                <div className="mt-4">
                  <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block">
                    Required Skill Stack:
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {teams[0].requiredSkills.map((sk) => (
                      <span
                        key={sk}
                        className="rounded-md border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs font-medium text-stone-700"
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/teammates?team=${teams[0].id}`}
                  className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-stone-900 bg-stone-900 py-2.5 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Discover Matching Candidates</span>
                </Link>
              </div>
            ) : (
              <div className="mt-4 py-4 text-center">
                <p className="text-xs text-stone-600">You haven&apos;t joined or created a squad yet.</p>
                <Link
                  href="/team"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create a Hackathon Team</span>
                </Link>
              </div>
            )}
          </div>

          {/* Evidence & Project Highlights */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
                EXTERNAL EVIDENCE
              </span>
              <Link href="/profile" className="text-xs font-semibold text-stone-900 hover:underline">
                Add Links
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {(profile.projects ?? []).slice(0, 2).map((proj, idx) => (
                <div key={idx} className="rounded-lg border border-stone-200/70 bg-stone-50/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-stone-900">{proj.title}</span>
                    {proj.url && (
                      <a
                        href={proj.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-400 hover:text-stone-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-500 line-clamp-2">{proj.description}</p>
                </div>
              ))}

              {(!profile.projects || profile.projects.length === 0) && (
                <p className="text-xs text-stone-500 py-3 text-center">
                  Attach GitHub projects and problem-solving proofs to increase candidate match ranking.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Profile = { displayName: string; headline: string; bio: string; skills: Array<{ name: string; status: string; assessmentScore?: number }> };
type Team = { id: string; name: string; hackathonName: string; requiredSkills: string[]; members: unknown[]; capacity: number };
const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function DashboardClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void Promise.all([fetch("/api/profile"), fetch("/api/teams")]).then(async ([profileResponse, teamResponse]) => {
      const profileBody = await profileResponse.json();
      const teamBody = await teamResponse.json();
      if (!profileResponse.ok) throw new Error(profileBody.error?.message ?? "Create your profile to open the dashboard.");
      if (!teamResponse.ok) throw new Error(teamBody.error?.message ?? "Unable to load teams.");
      setProfile(profileBody.profile);
      setTeams(teamBody.teams);
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load dashboard."));
  }, []);
  if (!profile && !error) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">Loading dashboard…</main>;
  if (!profile) return <main className="mx-auto max-w-5xl px-6 py-10"><h1 className="text-3xl font-semibold">Your profile comes first</h1><p className="mt-3 text-stone-600">{error}</p><Link href="/onboarding" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Create a local profile</Link></main>;
  const verified = profile.skills.filter((skill) => skill.status === "VERIFIED").length;
  return <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">PRAMAAN dashboard</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {profile.displayName.split(" ")[0]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">{profile.headline || "Build a profile backed by evidence, assessment results, and transparent integrity signals."}</p><section className="mt-10 border-t border-stone-300 pt-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Skill verification</p><h2 className="mt-2 text-2xl font-semibold">{verified} verified skill{verified === 1 ? "" : "s"}</h2></div><Link href="/skills" className="inline-flex h-10 items-center border border-stone-900 px-4 text-sm">Manage skills</Link></div><div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">{profile.skills.slice(0, 6).map((skill) => <div key={skill.name} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto]"><p className="font-medium">{skill.name}</p><p className="text-sm text-stone-600">{skill.assessmentScore === undefined ? "Assessment pending" : `${skill.assessmentScore}%`}</p><p className="text-sm font-medium">{label(skill.status)}</p></div>)}{profile.skills.length === 0 && <p className="py-4 text-sm text-stone-600">Claim your first skill to start a verification journey.</p>}</div><Link href="/assessments" className="mt-5 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Take an assessment</Link></section><section className="mt-12 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2"><div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Evidence</p><h2 className="mt-2 text-2xl font-semibold">Make claims traceable</h2><p className="mt-3 text-sm leading-6 text-stone-600">Projects and public technical links can support a skill but never certify it on their own.</p><Link href="/profile" className="mt-5 inline-block text-sm underline underline-offset-4">Add projects and evidence</Link></div><div className="border-l border-stone-300 pl-0 md:pl-8"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Hackathon teams</p><h2 className="mt-2 text-2xl font-semibold">{teams.length ? teams[0].name : "Find your team"}</h2><p className="mt-3 text-sm leading-6 text-stone-600">{teams.length ? `${teams[0].members.length} of ${teams[0].capacity} seats · Needs ${teams[0].requiredSkills.join(" · ")}` : "Join a hackathon, create a team, then discover complementary candidates."}</p><Link href={teams.length ? "/team" : "/hackathons"} className="mt-5 inline-block text-sm underline underline-offset-4">{teams.length ? "Manage team" : "Explore hackathons"}</Link></div></section></main>;
}

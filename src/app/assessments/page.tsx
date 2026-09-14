"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
type Profile = { skills: Array<{ name: string; status: string; assessmentScore?: number }> };
export default function AssessmentsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [skill, setSkill] = useState("JavaScript");
  const [difficulty, setDifficulty] = useState("intermediate");

  useEffect(() => {
    void fetch("/api/profile").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load skills.");
      setProfile(body.profile);
      if (body.profile.skills[0]?.name) setSkill(body.profile.skills[0].name);
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load skills."));
  }, []);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = skill.trim().replace(/\s+/g, " ");
    if (normalized.length < 2) return;
    router.push(`/assessments/${encodeURIComponent(normalized)}?difficulty=${difficulty}`);
  }

  if (!profile) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">{error ?? "Loading assessments..."}</main>;
  const skills = profile.skills;

  return <main className="mx-auto w-full max-w-5xl px-6 py-10"><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessments</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Technical proof, one skill at a time</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Choose any skill and level. The server generates OpenAI questions, stores answer keys privately, scores submissions, and creates a verification receipt.</p><form onSubmit={submit} className="mt-8 grid gap-4 border-y border-stone-300 py-6 md:grid-cols-[1fr_220px_auto] md:items-end"><label className="grid gap-2 text-sm font-medium">Skill<input value={skill} onChange={(event) => setSkill(event.target.value)} minLength={2} maxLength={80} required className="h-11 border border-stone-300 bg-white px-3" /></label><label className="grid gap-2 text-sm font-medium">Level<select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="h-11 border border-stone-300 bg-white px-3"><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label><button className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50">Generate assessment</button></form><div className="mt-8 divide-y divide-stone-200 border-y border-stone-200">{skills.map((skill) => <article key={skill.name} className="flex flex-col justify-between gap-4 py-5 sm:flex-row sm:items-center"><div><h2 className="font-medium">{skill.name}</h2><p className="mt-1 text-sm text-stone-600">Five MCQs · coding submission · 28 minutes · current status: {skill.status.replaceAll("_", " ").toLowerCase()}</p></div><Link href={`/assessments/${encodeURIComponent(skill.name)}?difficulty=intermediate`} className="inline-flex h-10 items-center border border-stone-900 px-4 text-sm">Start assessment</Link></article>)}{skills.length === 0 && <p className="py-5 text-sm text-stone-600">You can start with any skill above, then add verified results to your Skill Passport.</p>}</div></main>;
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Team = {
  id: string;
  name: string;
  hackathonName: string;
  requiredSkills: string[];
  members: Array<{ profileId: string; role: string; status: string }>;
  capacity: number;
};

export default function TeamClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void fetch("/api/teams").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load teams.");
      setTeams(body.teams);
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load teams.")).finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">Loading teams...</main>;
  if (error) return <main className="mx-auto max-w-5xl px-6 py-10"><h1 className="text-3xl font-semibold">Team access needs a profile</h1><p className="mt-3 text-sm text-stone-600">{error}</p><Link href="/onboarding" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Create profile</Link></main>;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">My team</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Team workspace</h1>
      <p className="mt-2 max-w-2xl text-base text-stone-600">Manage real teams, required skills, members, and candidate discovery from stored data.</p>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
          {teams.map((team) => (
            <article key={team.id} className="py-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                  <h2 className="text-lg font-semibold text-stone-900">{team.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">{team.hackathonName} · {team.members.length}/{team.capacity} seats</p>
              </div>
                <Link href={`/teammates?team=${team.id}`} className="text-sm font-medium underline underline-offset-4">Discover candidates</Link>
            </div>
              <p className="mt-4 text-sm text-stone-600">Needs: {team.requiredSkills.join(" · ")}</p>
            </article>
          ))}
          {teams.length === 0 && <p className="py-5 text-sm text-stone-600">No teams yet. Join a hackathon and create a team to start discovery.</p>}
        </div>
      </section>
    </main>
  );
}

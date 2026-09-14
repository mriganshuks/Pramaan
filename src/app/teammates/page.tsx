"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function TeammatesPage() {
  const [teams, setTeams] = useState<Array<{ id: string; name: string; requiredSkills: string[] }>>([]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [candidates, setCandidates] = useState<Array<{ id: string; displayName: string; headline: string; matchScore: number; reasons: string[]; skills: Array<{ name: string; status: string; assessmentScore?: number }> }>>([]);
  const [error, setError] = useState<string | null>(null);
  const team = useMemo(() => teams.find((item) => item.id === selectedTeamId), [teams, selectedTeamId]);

  useEffect(() => {
    const initialTeam = new URLSearchParams(window.location.search).get("team") ?? "";
    void fetch("/api/teams").then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load teams.");
      setTeams(body.teams);
      setSelectedTeamId(initialTeam || body.teams[0]?.id || "");
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load teams."));
  }, []);

  useEffect(() => {
    if (!selectedTeamId) return;
    void fetch(`/api/teams/${selectedTeamId}/candidates`).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load candidates.");
      setCandidates(body.candidates);
    }).catch((error: unknown) => setError(error instanceof Error ? error.message : "Unable to load candidates."));
  }, [selectedTeamId]);

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Find teammates
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        Complementary skills, clearer matches
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-7 text-stone-600">
        Recommendations explain which required skills each participant brings to your team.
      </p>
      <section className="mt-10 border-t border-stone-300 pt-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Candidate discovery
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-900">
            {team ? `Recommended for ${team.name}` : "Select a team"}
          </h2>
        </div>
        {teams.length > 0 && <select value={selectedTeamId} onChange={(event) => setSelectedTeamId(event.target.value)} className="h-10 border border-stone-300 bg-white px-3 text-sm">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select>}
      </div>
      {team && <p className="mt-3 text-sm text-stone-600">Team needs: {team.requiredSkills.join(" · ")}</p>}
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

      <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
        {candidates.map((candidate) => (
          <article key={candidate.id} className="py-6">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-lg font-semibold text-stone-900">{candidate.displayName}</h3>
                <p className="mt-1 text-sm text-stone-600">{candidate.headline || "Available for teams"}</p>
              </div>
              <p className="text-sm font-semibold text-stone-900">Match: {candidate.matchScore}%</p>
            </div>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-stone-600 md:grid-cols-[1fr_1.4fr]">
              <p>
                <span className="font-medium text-stone-900">Verified skills:</span>{" "}
                {candidate.skills.filter((skill) => skill.status !== "CLAIMED").map((skill) => skill.name).join(" · ") || "No verified skills yet"}
              </p>
              <p>
                <span className="font-medium text-stone-900">Why recommended:</span>{" "}
                {candidate.reasons.join(" ")}
              </p>
            </div>
            <Link
              href={`/teammates/${candidate.id}?team=${selectedTeamId}`}
              className="mt-4 inline-flex text-sm font-medium text-stone-900 underline underline-offset-4"
            >
              View candidate
            </Link>
          </article>
        ))}
        {teams.length === 0 && <p className="py-5 text-sm text-stone-600">Create or join a team before discovering candidates.</p>}
        {teams.length > 0 && candidates.length === 0 && <p className="py-5 text-sm text-stone-600">No matching candidates found for this team yet.</p>}
      </div>
      </section>
    </main>
  );
}

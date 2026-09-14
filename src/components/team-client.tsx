"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";

type TeamMember = {
  profileId: string;
  role: string;
  status: string;
};

type Team = {
  id: string;
  name: string;
  hackathonName: string;
  requiredSkills: string[];
  members: TeamMember[];
  capacity: number;
};

type ChallengeItem = {
  id: string;
  teamId: string;
  candidateId: string;
  candidateName: string;
  candidateHandle: string;
  skill: string;
  state: "SENT" | "IN_PROGRESS" | "SUBMITTED" | "ACCEPTED" | "REJECTED";
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  integrity: {
    score: number;
    riskLevel: string;
    eventCount: number;
  };
  createdAt: string;
  completedAt: string | null;
};

export default function TeamClient() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [challenges, setChallenges] = useState<Record<string, ChallengeItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New Team Modal / Form State
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [hackathonName, setHackathonName] = useState("");
  const [requiredSkillsInput, setRequiredSkillsInput] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchChallengesForTeams = useCallback(async (loadedTeams: Team[]) => {
    const results: Record<string, ChallengeItem[]> = {};
    await Promise.all(
      loadedTeams.map(async (team) => {
        try {
          const res = await fetch(`/api/teams/${team.id}/challenges`);
          if (res.ok) {
            const data = await res.json();
            results[team.id] = data.challenges ?? [];
          }
        } catch {
          // ignore silent errors for challenges fetch
        }
      })
    );
    setChallenges(results);
  }, []);

  const loadTeams = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch("/api/teams");
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? "Unable to load teams.");
      const loadedTeams: Team[] = body.teams ?? [];
      setTeams(loadedTeams);
      await fetchChallengesForTeams(loadedTeams);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to load teams.");
    } finally {
      setLoading(false);
    }
  }, [fetchChallengesForTeams]);

  useEffect(() => {
    let active = true;
    async function init() {
      try {
        const response = await fetch("/api/teams");
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message ?? "Unable to load teams.");
        if (!active) return;
        const loadedTeams: Team[] = body.teams ?? [];
        setTeams(loadedTeams);
        await fetchChallengesForTeams(loadedTeams);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load teams.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void init();
    return () => {
      active = false;
    };
  }, [fetchChallengesForTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !hackathonName.trim()) {
      setActionNotice({ type: "error", message: "Please provide team name and hackathon name." });
      return;
    }
    const skills = requiredSkillsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setIsSubmitting(true);
    setActionNotice(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: teamName.trim(),
          hackathonName: hackathonName.trim(),
          requiredSkills: skills,
          capacity,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message ?? "Failed to create team.");
      }
      setShowCreateTeam(false);
      setTeamName("");
      setHackathonName("");
      setRequiredSkillsInput("");
      setActionNotice({ type: "success", message: `Team "${data.team.name}" created successfully.` });
      await loadTeams();
    } catch (err) {
      setActionNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to create team." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChallengeDecision = async (teamId: string, challengeId: string, decision: "ACCEPT" | "REJECT") => {
    setActionNotice(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/challenges`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, decision }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error?.message ?? "Failed to submit challenge decision.");
      }
      setActionNotice({
        type: "success",
        message: decision === "ACCEPT" ? "Candidate accepted into team!" : "Candidate challenge declined.",
      });
      await loadTeams();
    } catch (err) {
      setActionNotice({ type: "error", message: err instanceof Error ? err.message : "Action failed." });
    }
  };

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">Loading teams and candidate challenges...</main>;
  if (error) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold text-stone-900">Team access needs a profile</h1>
        <p className="mt-3 text-sm text-stone-600">{error}</p>
        <Link href="/onboarding" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">
          Create profile
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">My team</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">Team workspace</h1>
          <p className="mt-1 text-sm text-stone-600">Review candidate proofs, challenge submissions, and assemble verified hackathon squads.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateTeam(true)}
          className="inline-flex h-10 items-center justify-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50 hover:bg-stone-800 transition"
        >
          Create New Team
        </button>
      </div>

      {actionNotice && (
        <div className={`mt-6 p-4 text-sm border ${actionNotice.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"}`}>
          {actionNotice.message}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white p-6 border border-stone-300 shadow-xl">
            <h2 className="text-lg font-semibold text-stone-900">Create a New Team</h2>
            <p className="mt-1 text-sm text-stone-600">Register your team for a hackathon and set skill requirements.</p>
            <form onSubmit={handleCreateTeam} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Core"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="mt-1 w-full border border-stone-300 p-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">Hackathon Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Global AI & Systems Hackathon 2026"
                  value={hackathonName}
                  onChange={(e) => setHackathonName(e.target.value)}
                  className="mt-1 w-full border border-stone-300 p-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. TypeScript, React, Python, PostgreSQL"
                  value={requiredSkillsInput}
                  onChange={(e) => setRequiredSkillsInput(e.target.value)}
                  className="mt-1 w-full border border-stone-300 p-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-600">Team Capacity</label>
                <input
                  type="number"
                  min={2}
                  max={10}
                  value={capacity}
                  onChange={(e) => setCapacity(Number(e.target.value))}
                  className="mt-1 w-full border border-stone-300 p-2 text-sm text-stone-900 focus:border-stone-900 focus:outline-none"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="border border-stone-900 bg-stone-900 px-4 py-2 text-sm font-medium text-stone-50 hover:bg-stone-800 disabled:opacity-50"
                >
                  {isSubmitting ? "Creating..." : "Create Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teams List */}
      <section className="mt-8 space-y-8">
        {teams.map((team) => {
          const teamChallenges = challenges[team.id] ?? [];
          const activeMembersCount = team.members.filter((m) => m.status === "ACTIVE").length;

          return (
            <article key={team.id} className="border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <h2 className="text-xl font-semibold text-stone-900">{team.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {team.hackathonName} · {activeMembersCount}/{team.capacity} seats filled
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {team.requiredSkills.map((s) => (
                      <span key={s} className="border border-stone-200 bg-stone-50 px-2 py-0.5 text-xs text-stone-700">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <Link
                  href={`/teammates?team=${team.id}`}
                  className="inline-flex h-9 items-center border border-stone-900 px-3 text-sm font-medium text-stone-900 hover:bg-stone-50 transition"
                >
                  Discover Candidates
                </Link>
              </div>

              {/* Team Challenges & Evaluations */}
              <div className="mt-6 border-t border-stone-100 pt-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-600">
                  Candidate Challenges ({teamChallenges.length})
                </h3>

                {teamChallenges.length === 0 ? (
                  <p className="mt-3 text-xs text-stone-500 italic">
                    No skill challenges sent yet. Use &ldquo;Discover Candidates&rdquo; to test potential teammates before inviting them.
                  </p>
                ) : (
                  <div className="mt-3 divide-y divide-stone-100 border-y border-stone-100">
                    {teamChallenges.map((ch) => (
                      <div key={ch.id} className="flex flex-col justify-between gap-3 py-3 sm:flex-row sm:items-center text-sm">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-stone-900">{ch.candidateName}</span>
                            <span className="text-xs text-stone-500">(@{ch.candidateHandle})</span>
                            <span className="border border-stone-300 px-1.5 py-0.5 text-xs font-mono text-stone-700">
                              {ch.skill}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-stone-600">
                            <span>Status: <strong>{ch.state}</strong></span>
                            {ch.state === "SUBMITTED" || ch.state === "ACCEPTED" || ch.state === "REJECTED" ? (
                              <>
                                <span>Score: <strong>{ch.score.percentage}%</strong> ({ch.score.correct}/{ch.score.total})</span>
                                <span>Integrity: <strong>{ch.integrity.score}/100</strong> ({ch.integrity.riskLevel})</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        {ch.state === "SUBMITTED" && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleChallengeDecision(team.id, ch.id, "ACCEPT")}
                              className="border border-stone-900 bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50 hover:bg-stone-800 transition"
                            >
                              Accept to Team
                            </button>
                            <button
                              type="button"
                              onClick={() => handleChallengeDecision(team.id, ch.id, "REJECT")}
                              className="border border-stone-300 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {ch.state === "ACCEPTED" && (
                          <span className="inline-flex items-center text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 border border-emerald-200">
                            Accepted as Member
                          </span>
                        )}

                        {ch.state === "REJECTED" && (
                          <span className="inline-flex items-center text-xs font-medium text-stone-500 bg-stone-50 px-2 py-1 border border-stone-200">
                            Declined
                          </span>
                        )}

                        {(ch.state === "SENT" || ch.state === "IN_PROGRESS") && (
                          <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-1 border border-amber-200">
                            Awaiting Candidate Completion
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}

        {teams.length === 0 && (
          <div className="border border-dashed border-stone-300 p-8 text-center text-stone-600">
            <p className="text-base font-medium text-stone-900">No teams created yet</p>
            <p className="mt-1 text-sm text-stone-500">Create your team to begin discovering verified talent and running skill challenges.</p>
            <button
              type="button"
              onClick={() => setShowCreateTeam(true)}
              className="mt-4 inline-flex h-9 items-center border border-stone-900 bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-800"
            >
              Create Team Now
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

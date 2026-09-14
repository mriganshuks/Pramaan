"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { 
  ArrowLeft, 
  ExternalLink, 
  ShieldCheck, 
  FolderGit2, 
  Link2, 
  UserCheck, 
  Zap, 
  Mail, 
  CheckCircle2, 
  AlertCircle,
  X
} from "lucide-react";
import { StatusBadge } from "@/components/ui-shared";

type PublicProfile = {
  displayName: string;
  handle: string;
  headline: string;
  bio: string;
  skills: Array<{
    name: string;
    status: string;
    assessmentScore?: number;
    evidenceCount: number;
  }>;
  projects: Array<{
    title: string;
    description: string;
    url?: string;
    skills: string[];
  }>;
  evidence: Array<{
    source: string;
    url: string;
    description: string;
    skills: string[];
  }>;
};

export default function CandidateProfileClient({
  candidateId,
  teamId,
}: {
  candidateId: string;
  teamId?: string;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [inviteMessage, setInviteMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [actionNotice, setActionNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    void fetch(`/api/profiles/${candidateId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error?.message ?? "Unable to load candidate.");
        setProfile(body.profile);
      })
      .catch((error: unknown) =>
        setError(
          error instanceof Error ? error.message : "Unable to load candidate.",
        ),
      );
  }, [candidateId]);

  if (error) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <p className="font-bold text-base">Candidate Not Found</p>
          <p className="mt-1 text-xs">{error}</p>
          <Link
            href="/teammates"
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-stone-900 px-4 text-xs font-semibold text-stone-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Discovery</span>
          </Link>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-32 rounded-lg bg-stone-200" />
          <div className="h-64 rounded-3xl bg-stone-100 border border-stone-200" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Back Link */}
      <div>
        <Link
          href={teamId ? `/team/${teamId}` : "/teammates"}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{teamId ? "Back to Workspace" : "Back to Matchmaking Discovery"}</span>
        </Link>
      </div>

      {/* Hero Candidate Card */}
      <div className="mt-4 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 font-mono font-bold text-xl shadow-xs shrink-0">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-stone-900">
                  {profile.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  PRAMAAN Candidate
                </span>
              </div>
              <p className="mt-1 text-xs font-medium text-stone-600">
                @{profile.handle}
                {profile.headline ? ` · ${profile.headline}` : ""}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-stone-600 max-w-xl">
                {profile.bio || "No technical biography provided."}
              </p>
            </div>
          </div>

          <Link
            href={`/passport/${profile.handle}`}
            target="_blank"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition shrink-0"
          >
            <ShieldCheck className="h-4 w-4 text-stone-700" />
            <span>View Public Passport</span>
            <ExternalLink className="h-3 w-3 text-stone-400" />
          </Link>
        </div>

        {/* Quick Stats Banner */}
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-stone-100 pt-6 text-center">
          <div className="rounded-xl bg-stone-50/70 p-3 border border-stone-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Verified Skills</span>
            <span className="mt-0.5 text-xl font-bold text-stone-900 block">
              {profile.skills.filter((s) => s.status === "VERIFIED").length}
            </span>
          </div>
          <div className="rounded-xl bg-stone-50/70 p-3 border border-stone-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">Projects</span>
            <span className="mt-0.5 text-xl font-bold text-stone-900 block">
              {profile.projects.length}
            </span>
          </div>
          <div className="rounded-xl bg-stone-50/70 p-3 border border-stone-100">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 block">External Proofs</span>
            <span className="mt-0.5 text-xl font-bold text-stone-900 block">
              {profile.evidence.length}
            </span>
          </div>
        </div>
      </div>

      {/* Recruiter / Team Leader Action Section */}
      {teamId && (
        <section className="mt-6 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <UserCheck className="h-5 w-5 text-stone-700" />
            <h2 className="text-base font-bold text-stone-900">Verify & Recruit Candidate</h2>
          </div>
          <p className="mt-2 text-xs text-stone-600">
            Challenge this candidate to a proctored technical test, or extend an immediate invitation to your squad.
          </p>

          {actionNotice && (
            <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs font-medium ${
              actionNotice.type === "success" 
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200" 
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}>
              {actionNotice.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              )}
              <span>{actionNotice.message}</span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setShowChallengeModal(true);
                setSelectedSkill(profile.skills[0]?.name || "");
              }}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition"
            >
              <Zap className="h-3.5 w-3.5 text-stone-600" />
              <span>Send Skill Challenge</span>
            </button>
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-900 bg-stone-900 px-5 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Send Team Invitation</span>
            </button>
          </div>
        </section>
      )}

      {/* Skills Matrix */}
      <section className="mt-6 rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs sm:p-8">
        <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
          Technical Skills & Benchmarks
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {profile.skills.map((skill) => (
            <div
              key={skill.name}
              className="flex items-center justify-between rounded-xl border border-stone-200/80 bg-stone-50/40 p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-stone-900">{skill.name}</span>
                  <StatusBadge status={skill.status} />
                </div>
                <span className="text-[11px] text-stone-500 mt-1 block">
                  {skill.evidenceCount ? `${skill.evidenceCount} verified proofs` : "No external links"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-stone-400 block">Score</span>
                <span className="font-bold text-xs text-stone-900 font-mono">
                  {skill.assessmentScore !== undefined ? `${skill.assessmentScore}%` : "—"}
                </span>
              </div>
            </div>
          ))}

          {profile.skills.length === 0 && (
            <p className="text-xs text-stone-500 py-4 text-center col-span-2">
              No technical skills claimed by this candidate yet.
            </p>
          )}
        </div>
      </section>

      {/* Projects & Evidence */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <FolderGit2 className="h-4 w-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">Technical Projects</h2>
          </div>
          <div className="mt-4 space-y-3">
            {profile.projects.map((p) => (
              <div key={p.title} className="rounded-xl border border-stone-200/80 p-3.5 bg-stone-50/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-stone-900">{p.title}</h3>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noreferrer" className="text-stone-400 hover:text-stone-700">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <p className="mt-1 text-xs text-stone-600 leading-relaxed">{p.description}</p>
              </div>
            ))}
            {profile.projects.length === 0 && (
              <p className="text-xs text-stone-500 py-3 text-center">No projects listed.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
            <Link2 className="h-4 w-4 text-stone-700" />
            <h2 className="text-sm font-bold text-stone-900">External Coding Proofs</h2>
          </div>
          <div className="mt-4 space-y-3">
            {profile.evidence.map((item) => (
              <a
                key={item.url}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-stone-200/80 p-3.5 bg-stone-50/30 hover:bg-stone-50/70 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-stone-800 bg-stone-200/70 px-2 py-0.5 rounded">
                    {item.source}
                  </span>
                  <ExternalLink className="h-3 w-3 text-stone-400" />
                </div>
                <p className="mt-1.5 text-xs text-stone-600">{item.description}</p>
              </a>
            ))}
            {profile.evidence.length === 0 && (
              <p className="text-xs text-stone-500 py-3 text-center">No external evidence links attached.</p>
            )}
          </div>
        </section>
      </div>

      {/* Challenge Modal */}
      {showChallengeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Issue Skill Challenge</h3>
              <button
                type="button"
                onClick={() => setShowChallengeModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              Candidate will receive a timed, proctored challenge for this skill before joining.
            </p>

            <div className="mt-4 space-y-3">
              <label className="text-xs font-semibold text-stone-700 block">
                Target Skill
              </label>
              {profile.skills.length > 0 ? (
                <select
                  value={selectedSkill}
                  onChange={(e) => setSelectedSkill(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-900 focus:border-stone-900"
                >
                  {profile.skills.map((s) => (
                    <option key={s.name} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                  <option value="__custom__">+ Custom skill name...</option>
                </select>
              ) : null}

              {(profile.skills.length === 0 || selectedSkill === "__custom__") && (
                <input
                  type="text"
                  placeholder="e.g. Python, TypeScript, Docker"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 px-3 py-2 text-xs text-stone-900 focus:border-stone-900"
                />
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSending}
                onClick={() => setShowChallengeModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={async () => {
                  const finalSkill = selectedSkill === "__custom__" || profile.skills.length === 0 ? customSkill.trim() : selectedSkill;
                  if (!finalSkill) {
                    setActionNotice({ type: "error", message: "Please specify a skill name." });
                    return;
                  }
                  setIsSending(true);
                  setActionNotice(null);
                  try {
                    const res = await fetch(`/api/teams/${teamId}/challenges`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ candidateId, skill: finalSkill }),
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                      throw new Error(data.error?.message ?? "Failed to send challenge.");
                    }
                    setShowChallengeModal(false);
                    setCustomSkill("");
                    setActionNotice({ type: "success", message: `Skill challenge for "${finalSkill}" sent successfully.` });
                  } catch (err) {
                    setActionNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to send challenge." });
                  } finally {
                    setIsSending(false);
                  }
                }}
                className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Issue Challenge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900">Invite to Team</h3>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-stone-600">
              Send an official squad invitation to {profile.displayName}.
            </p>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-stone-700 block">
                Personalized Message (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="We were impressed by your verified benchmarks and would love to collaborate..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="w-full rounded-xl border border-stone-300 p-3 text-xs text-stone-900 focus:border-stone-900"
              />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSending}
                onClick={() => setShowInviteModal(false)}
                className="rounded-xl border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={async () => {
                  setIsSending(true);
                  setActionNotice(null);
                  try {
                    const res = await fetch(`/api/teams/${teamId}/invitations`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ candidateId, message: inviteMessage.trim() || undefined }),
                    });
                    const data = await res.json();
                    if (!res.ok || data.error) {
                      throw new Error(data.error?.message ?? "Failed to send invitation.");
                    }
                    setShowInviteModal(false);
                    setInviteMessage("");
                    setActionNotice({ type: "success", message: `Invitation sent to ${profile.displayName}.` });
                  } catch (err) {
                    setActionNotice({ type: "error", message: err instanceof Error ? err.message : "Failed to send invitation." });
                  } finally {
                    setIsSending(false);
                  }
                }}
                className="rounded-xl border border-stone-900 bg-stone-900 px-4 py-2 text-xs font-semibold text-stone-50 hover:bg-stone-800 disabled:opacity-50"
              >
                {isSending ? "Sending..." : "Send Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

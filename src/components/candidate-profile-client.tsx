"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function CandidateProfileClient({
  candidateId,
  teamId,
}: {
  candidateId: string;
  teamId?: string;
}) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (error)
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <p className="text-sm text-red-700">{error}</p>
        <Link
          href="/teammates"
          className="mt-5 inline-block text-sm underline underline-offset-4"
        >
          Back to discovery
        </Link>
      </main>
    );
  if (!profile)
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-sm text-stone-600">
        Loading candidate...
      </main>
    );

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <Link
        href="/teammates"
        className="text-sm text-stone-600 underline underline-offset-4"
      >
        Back to discovery
      </Link>
      <p className="mt-10 text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        Candidate profile
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">
        {profile.displayName}
      </h1>
      <p className="mt-2 text-lg text-stone-700">
        {profile.headline || `@${profile.handle}`}
      </p>
      <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
        {profile.bio || "No bio added yet."}
      </p>
      <section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Skills
          </p>
          <div className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {profile.skills.map((skill) => (
              <div
                key={skill.name}
                className="flex justify-between gap-4 py-4 text-sm"
              >
                <span className="font-medium text-stone-900">{skill.name}</span>
                <span className="text-stone-600">
                  {label(skill.status)}
                  {skill.assessmentScore !== undefined
                    ? ` · ${skill.assessmentScore}%`
                    : ""}
                </span>
              </div>
            ))}
            {profile.skills.length === 0 && (
              <p className="py-4 text-sm text-stone-600">No skills added.</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
            Evidence
          </p>
          <div className="mt-4 space-y-4">
            {profile.evidence.map((item) => (
              <a
                key={item.url}
                href={item.url}
                className="block border-y border-stone-200 py-3 text-sm"
              >
                <span className="font-medium text-stone-900">
                  {item.source}
                </span>
                <span className="mt-1 block text-stone-600">
                  {item.description}
                </span>
              </a>
            ))}
            {profile.evidence.length === 0 && (
              <p className="text-sm text-stone-600">No evidence links added.</p>
            )}
          </div>
        </div>
      </section>

      {teamId && (
        <section className="mt-10 border-t border-stone-300 pt-8">
          <h2 className="text-2xl font-semibold text-stone-900">Verify & Recruit</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            Ensure this candidate has the right skills before accepting them to your team.
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              onClick={() => {
                const skill = window.prompt("Which skill do you want to challenge?");
                if (!skill) return;
                fetch(`/api/teams/${teamId}/challenges`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ candidateId, skill }),
                }).then(res => res.json()).then(data => {
                  if (data.error) alert(data.error.message);
                  else alert("Skill challenge sent successfully.");
                });
              }}
              className="h-11 border border-stone-900 bg-white px-5 text-sm font-medium text-stone-900 hover:bg-stone-50"
            >
              Send skill challenge
            </button>
            <button
              onClick={() => {
                const message = window.prompt("Add an optional message for the candidate:");
                if (message === null) return;
                fetch(`/api/teams/${teamId}/invitations`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ candidateId, message }),
                }).then(res => res.json()).then(data => {
                  if (data.error) alert(data.error.message);
                  else alert("Invitation sent successfully.");
                });
              }}
              className="h-11 border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
            >
              Send invitation
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

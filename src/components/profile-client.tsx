"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { 
  User, 
  Share2, 
  ExternalLink, 
  Plus, 
  FolderGit2, 
  Link2, 
  Save, 
  CheckCircle2,
  Trash2,
  AlertCircle
} from "lucide-react";

type Project = {
  _id: string;
  title: string;
  description: string;
  url?: string;
  skills: string[];
};

type Evidence = {
  _id: string;
  source: string;
  url: string;
  description: string;
  skills: string[];
};

type Profile = {
  id: string;
  displayName: string;
  email: string;
  handle: string;
  headline: string;
  bio: string;
  location: string;
  education: string;
  availableForTeams: boolean;
  skills: Array<{
    name: string;
    status: string;
    assessmentScore?: number;
    evidenceCount: number;
  }>;
  projects: Project[];
  evidence: Evidence[];
};

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error?.message ?? "Unable to process request.");
  return body as T;
}

export default function ProfileClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void request<{ profile: Profile }>("/api/profile")
      .then(({ profile }) => setProfile(profile))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Unable to load profile.")
      )
      .finally(() => setLoading(false));
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    try {
      const { profile: updated } = await request<{ profile: Profile }>("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: form.get("displayName"),
          headline: form.get("headline"),
          bio: form.get("bio"),
          location: form.get("location"),
          education: form.get("education"),
          availableForTeams: form.get("availableForTeams") === "on",
        }),
      });
      setProfile(updated);
      setNotice("Profile information saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function addProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setNotice(null);
    try {
      const { profile: updated } = await request<{ profile: Profile }>("/api/profile/projects", {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          description: form.get("description"),
          url: form.get("url"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setProfile(updated);
      event.currentTarget.reset();
      setNotice("Project evidence attached to your profile.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add project.");
    }
  }

  async function addEvidence(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    setNotice(null);
    try {
      const { profile: updated } = await request<{ profile: Profile }>("/api/profile/evidence", {
        method: "POST",
        body: JSON.stringify({
          source: form.get("source"),
          url: form.get("url"),
          description: form.get("description"),
          skills: String(form.get("skills") ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      });
      setProfile(updated);
      event.currentTarget.reset();
      setNotice("External evidence link attached.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to add evidence.");
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 rounded-lg bg-stone-200" />
          <div className="h-64 rounded-xl bg-stone-100 border border-stone-200" />
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <p className="font-bold text-lg">Profile Not Found</p>
          <p className="mt-2 text-sm">{error ?? "Create your profile to start using PRAMAAN."}</p>
          <Link
            href="/onboarding"
            className="mt-4 inline-flex h-10 items-center rounded-lg bg-stone-900 px-5 text-xs font-semibold text-white"
          >
            Create Profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
            PROFILE & EVIDENCE
          </span>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-stone-900">
            Candidate Credentials
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Personal identity, technical portfolio projects, and external verified coding accounts.
          </p>
        </div>

        <Link
          href={`/passport/${profile.handle}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 text-xs font-semibold text-stone-800 shadow-xs hover:bg-stone-50 transition"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>View Public Passport</span>
          <ExternalLink className="h-3 w-3 text-stone-400" />
        </Link>
      </div>

      {notice && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {error && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-800">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Left Col: Personal Details */}
        <div className="lg:col-span-1">
          <form
            onSubmit={save}
            className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs space-y-4"
          >
            <h2 className="text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
              Candidate Details
            </h2>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Display Name
              </label>
              <input
                name="displayName"
                required
                defaultValue={profile.displayName}
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Headline / Role
              </label>
              <input
                name="headline"
                defaultValue={profile.headline}
                placeholder="e.g. Distributed Systems Engineer"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Location
              </label>
              <input
                name="location"
                defaultValue={profile.location}
                placeholder="e.g. San Francisco, CA or Remote"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Education / Affiliation
              </label>
              <input
                name="education"
                defaultValue={profile.education}
                placeholder="e.g. B.S. Computer Science"
                className="h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-stone-900"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Technical Bio
              </label>
              <textarea
                name="bio"
                defaultValue={profile.bio}
                rows={4}
                placeholder="Brief summary of engineering interests and experience..."
                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 focus:border-stone-900"
              />
            </div>

            <div className="pt-2 border-t border-stone-100">
              <label className="flex items-center gap-3 text-xs font-medium text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  name="availableForTeams"
                  defaultChecked={profile.availableForTeams}
                  className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-0"
                />
                <span>Available for hackathon matchmaking</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-stone-900 bg-stone-900 py-2.5 text-xs font-semibold text-stone-50 shadow-xs hover:bg-stone-800 transition disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? "Saving…" : "Save Profile Details"}</span>
            </button>
          </form>
        </div>

        {/* Right 2 Cols: Projects & External Evidence */}
        <div className="lg:col-span-2 space-y-8">
          {/* Projects Section */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <FolderGit2 className="h-5 w-5 text-stone-700" />
              <h2 className="text-base font-bold text-stone-900">Technical Projects</h2>
            </div>

            <div className="mt-4 space-y-3">
              {profile.projects.map((project) => (
                <div
                  key={project._id}
                  className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-4 transition hover:bg-stone-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-sm text-stone-900">{project.title}</h3>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 font-medium"
                      >
                        <span>Code / Demo</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-600 leading-relaxed">
                    {project.description}
                  </p>
                  {project.skills && project.skills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {project.skills.map((sk) => (
                        <span
                          key={sk}
                          className="rounded bg-stone-200/70 px-2 py-0.5 text-[11px] font-medium text-stone-700"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {profile.projects.length === 0 && (
                <p className="py-4 text-center text-xs text-stone-500">
                  No projects attached yet. Add key repositories or live projects below.
                </p>
              )}
            </div>

            {/* Add Project Form */}
            <form onSubmit={addProject} className="mt-6 border-t border-stone-100 pt-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Attach New Project
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="title"
                  required
                  placeholder="Project title (e.g. Distributed Key-Value Store)"
                  className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900"
                />
                <input
                  name="url"
                  type="url"
                  placeholder="Repository or live URL"
                  className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900"
                />
              </div>
              <textarea
                name="description"
                required
                minLength={10}
                rows={2}
                placeholder="What architectural decisions and technologies did you use?"
                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-xs text-stone-900"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <input
                  name="skills"
                  placeholder="Skills used, comma-separated (e.g. Go, Raft, Docker)"
                  className="h-10 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-900 bg-stone-900 px-4 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Attach Project</span>
                </button>
              </div>
            </form>
          </div>

          {/* External Evidence Section */}
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2 border-b border-stone-100 pb-3">
              <Link2 className="h-5 w-5 text-stone-700" />
              <h2 className="text-base font-bold text-stone-900">External Coding Proofs</h2>
            </div>

            <div className="mt-4 space-y-3">
              {profile.evidence.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl border border-stone-200/80 bg-stone-50/40 p-4 transition hover:bg-stone-50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="rounded bg-stone-200/80 px-2 py-0.5 text-[11px] font-mono font-bold text-stone-800">
                      {item.source}
                    </span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-stone-500 hover:text-stone-900 inline-flex items-center gap-1 font-medium"
                    >
                      <span>Open Link</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600">{item.description}</p>
                </div>
              ))}

              {profile.evidence.length === 0 && (
                <p className="py-4 text-center text-xs text-stone-500">
                  No external accounts linked yet. Add LeetCode, GitHub, or competitive coding profiles.
                </p>
              )}
            </div>

            {/* Add Evidence Form */}
            <form onSubmit={addEvidence} className="mt-6 border-t border-stone-100 pt-5 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-600 block">
                Link External Proof
              </span>
              <div className="grid gap-3 sm:grid-cols-3">
                <select
                  name="source"
                  className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900"
                >
                  <option value="GITHUB">GitHub Profile/Repo</option>
                  <option value="LEETCODE">LeetCode</option>
                  <option value="CODECHEF">CodeChef</option>
                  <option value="HACKERRANK">HackerRank</option>
                  <option value="OTHER">Other Technical Proof</option>
                </select>
                <input
                  name="url"
                  type="url"
                  required
                  placeholder="https://..."
                  className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900 sm:col-span-2"
                />
              </div>
              <textarea
                name="description"
                required
                minLength={4}
                rows={2}
                placeholder="Describe what this proof establishes (e.g. 500+ algorithmic problems solved, open source contributor)..."
                className="w-full rounded-lg border border-stone-300 bg-white p-3 text-xs text-stone-900"
              />
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <input
                  name="skills"
                  placeholder="Related skills, comma-separated (e.g. Algorithms, Data Structures, C++)"
                  className="h-10 flex-1 rounded-lg border border-stone-300 bg-white px-3 text-xs text-stone-900"
                />
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-stone-900 bg-stone-900 px-4 text-xs font-semibold text-stone-50 hover:bg-stone-800 transition shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Link Proof</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

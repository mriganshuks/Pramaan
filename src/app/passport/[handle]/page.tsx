import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { publicProfileByHandle } from "@/lib/profile-service";

type PassportPageProps = { params: Promise<{ handle: string }> };
type PublicSkill = { name: string; status: string; assessmentScore?: number; evidenceCount: number };
type PublicProject = { title: string; description: string; url?: string; skills: string[] };
type PublicEvidence = { source: string; url: string; description: string; skills: string[] };

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());

export const dynamic = "force-dynamic";

async function loadPassport(handle: string) {
  try {
    await connectToDatabase();
    return { profile: await publicProfileByHandle(handle), error: null };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError) return { profile: null, error: error.message };
    throw error;
  }
}

export default async function PassportPage({ params }: PassportPageProps) {
  const { handle } = await params;
  const { profile, error } = await loadPassport(handle);
  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Public Skill Passport</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">Passport unavailable</h1>
        <p className="mt-4 text-sm leading-6 text-stone-600">{error ?? "This Skill Passport cannot be loaded right now."}</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Return home</Link>
      </main>
    );
  }
  const skills = profile.skills as PublicSkill[];
  const projects = profile.projects as PublicProject[];
  const evidence = profile.evidence as PublicEvidence[];
  const verified = skills.filter((skill) => skill.status === "VERIFIED");
  const partial = skills.filter((skill) => skill.status === "PARTIALLY_VERIFIED");
  const claimed = skills.filter((skill) => skill.status === "CLAIMED" || skill.status === "NOT_VERIFIED");

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Public Skill Passport</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900">{profile.displayName}</h1>
      <p className="mt-2 text-sm text-stone-600">
        @{profile.handle}
        {profile.headline ? ` · ${profile.headline}` : ""}
      </p>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-stone-600">
        {profile.bio || "This passport shares verified skill signals, projects, and supporting evidence without exposing private account details."}
      </p>

      <section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-3">
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Verified</p><p className="mt-2 text-3xl font-semibold">{verified.length}</p></div>
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Partially verified</p><p className="mt-2 text-3xl font-semibold">{partial.length}</p></div>
        <div><p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Evidence</p><p className="mt-2 text-3xl font-semibold">{evidence.length}</p></div>
      </section>

      <section className="mt-10 border-t border-stone-300 pt-8">
        <h2 className="text-2xl font-semibold">Skills</h2>
        <div className="mt-5 divide-y divide-stone-200 border-y border-stone-200">
          {[...verified, ...partial, ...claimed].map((skill) => (
            <article key={skill.name} className="grid gap-2 py-4 sm:grid-cols-[1fr_auto_auto]">
              <p className="font-medium">{skill.name}</p>
              <p className="text-sm text-stone-600">{skill.assessmentScore === undefined ? "No assessment score" : `${skill.assessmentScore}%`}</p>
              <p className="text-sm font-medium">{label(skill.status)}</p>
            </article>
          ))}
          {skills.length === 0 && <p className="py-4 text-sm text-stone-600">No public skills yet.</p>}
        </div>
      </section>

      <section className="mt-10 grid gap-8 border-t border-stone-300 pt-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <div className="mt-5 space-y-5">
            {projects.map((project) => (
              <article key={project.title} className="border-y border-stone-200 py-4">
                <h3 className="font-medium">{project.url ? <a href={project.url}>{project.title}</a> : project.title}</h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{project.description}</p>
              </article>
            ))}
            {projects.length === 0 && <p className="text-sm text-stone-600">No projects added.</p>}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-semibold">Evidence</h2>
          <div className="mt-5 space-y-5">
            {evidence.map((item) => (
              <a key={item.url} href={item.url} className="block border-y border-stone-200 py-4">
                <span className="font-medium">{item.source}</span>
                <span className="mt-2 block text-sm leading-6 text-stone-600">{item.description}</span>
              </a>
            ))}
            {evidence.length === 0 && <p className="text-sm text-stone-600">No public evidence added.</p>}
          </div>
        </div>
      </section>

      <Link href="/" className="mt-10 text-sm font-medium underline underline-offset-4">About PRAMAAN</Link>
    </main>
  );
}

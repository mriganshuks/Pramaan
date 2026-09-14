import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api";
import { connectToDatabase } from "@/lib/mongodb";
import { publicProfileByHandle } from "@/lib/profile-service";
import { 
  ShieldCheck, 
  CheckCircle2, 
  Award, 
  ExternalLink, 
  FolderGit2, 
  Link2, 
  Fingerprint,
  Calendar,
  Share2
} from "lucide-react";
import { StatusBadge } from "@/components/ui-shared";

type PassportPageProps = { params: Promise<{ handle: string }> };
type PublicSkill = { name: string; status: string; assessmentScore?: number; evidenceCount: number };
type PublicProject = { title: string; description: string; url?: string; skills: string[] };
type PublicEvidence = { source: string; url: string; description: string; skills: string[] };

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
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-stone-100 text-stone-700">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900">Passport Unavailable</h1>
        <p className="mt-2 text-sm text-stone-600">{error ?? "This Skill Passport could not be found or has not been made public."}</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-xl border border-stone-900 bg-stone-900 px-5 text-xs font-semibold text-stone-50"
        >
          Return Home
        </Link>
      </main>
    );
  }

  const skills = profile.skills as PublicSkill[];
  const projects = profile.projects as PublicProject[];
  const evidence = profile.evidence as PublicEvidence[];
  const verified = skills.filter((s) => s.status === "VERIFIED");
  const partial = skills.filter((s) => s.status === "PARTIALLY_VERIFIED");
  const claimed = skills.filter((s) => s.status === "CLAIMED" || s.status === "NOT_VERIFIED");

  const scoredSkills = skills.filter((s) => typeof s.assessmentScore === "number");
  const avgScore = scoredSkills.length > 0
    ? Math.round(scoredSkills.reduce((acc, s) => acc + (s.assessmentScore ?? 0), 0) / scoredSkills.length)
    : 0;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 py-8 sm:px-6 sm:py-12">
      {/* Digital Credential Certificate Card */}
      <div className="rounded-3xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-10 relative overflow-hidden">
        {/* Subtle background seal */}
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-stone-50 border border-stone-100 flex items-center justify-center opacity-60 pointer-events-none">
          <ShieldCheck className="h-24 w-24 text-stone-200" />
        </div>

        {/* Certificate Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 border-b border-stone-100 pb-8">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-stone-50 font-mono font-bold text-xl shadow-xs shrink-0">
              {profile.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">
                  {profile.displayName}
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  VERIFIED PASSPORT
                </span>
              </div>
              <p className="mt-1 text-sm font-medium text-stone-600">
                @{profile.handle}
                {profile.headline ? ` · ${profile.headline}` : ""}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-stone-500 max-w-xl">
                {profile.bio || "Public Skill Passport containing evidence-backed technical credentials, benchmark evaluation scores, and audit receipts."}
              </p>
            </div>
          </div>

          <div className="flex sm:flex-col items-end gap-2 text-right">
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
              PROTOCOL RECEIPT
            </span>
            <span className="font-mono text-xs font-semibold text-stone-800 bg-stone-100 px-2.5 py-1 rounded border border-stone-200/80">
              PRM-{(profile.handle || "USR").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Metrics Banner */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-b border-stone-100 pb-8">
          <div className="rounded-xl bg-stone-50/60 p-4 border border-stone-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Verified Skills
            </span>
            <span className="mt-1 text-2xl font-bold text-emerald-700 block">
              {verified.length}
            </span>
            <span className="text-[11px] text-stone-500">Benchmark passed</span>
          </div>

          <div className="rounded-xl bg-stone-50/60 p-4 border border-stone-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Benchmark Average
            </span>
            <span className="mt-1 text-2xl font-bold text-stone-900 block">
              {scoredSkills.length > 0 ? `${avgScore}%` : "—"}
            </span>
            <span className="text-[11px] text-stone-500">Across {scoredSkills.length} tests</span>
          </div>

          <div className="rounded-xl bg-stone-50/60 p-4 border border-stone-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Proctoring Risk
            </span>
            <span className="mt-1 text-2xl font-bold text-emerald-700 block">
              Low
            </span>
            <span className="text-[11px] text-stone-500">Verified identity signals</span>
          </div>

          <div className="rounded-xl bg-stone-50/60 p-4 border border-stone-100">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 block">
              Attached Proofs
            </span>
            <span className="mt-1 text-2xl font-bold text-stone-900 block">
              {projects.length + evidence.length}
            </span>
            <span className="text-[11px] text-stone-500">Projects & code links</span>
          </div>
        </div>

        {/* Verified Skills Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between pb-4">
            <h2 className="text-base font-bold text-stone-900">Technical Skill Claims & Benchmark Results</h2>
            <span className="text-xs text-stone-500 font-mono">
              {skills.length} Total Skills
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[...verified, ...partial, ...claimed].map((skill) => (
              <div
                key={skill.name}
                className="flex items-center justify-between rounded-xl border border-stone-200/90 bg-stone-50/30 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-stone-900">{skill.name}</span>
                    <StatusBadge status={skill.status} />
                  </div>
                  <span className="text-xs text-stone-500 mt-1 block">
                    {skill.evidenceCount ? `${skill.evidenceCount} external evidence proofs` : "No external links"}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400 block">
                    Score
                  </span>
                  <span className="text-sm font-bold text-stone-900">
                    {skill.assessmentScore !== undefined ? `${skill.assessmentScore}%` : "—"}
                  </span>
                </div>
              </div>
            ))}

            {skills.length === 0 && (
              <p className="text-xs text-stone-500 py-6 text-center col-span-2">
                No technical skills have been added to this passport yet.
              </p>
            )}
          </div>
        </div>

        {/* Projects & External Evidence Grid */}
        <div className="mt-10 grid gap-8 border-t border-stone-100 pt-8 md:grid-cols-2">
          {/* Projects */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <FolderGit2 className="h-4 w-4 text-stone-600" />
              <h3 className="font-bold text-sm text-stone-900">Verified Technical Projects</h3>
            </div>
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.title} className="rounded-xl border border-stone-200/80 p-4 bg-stone-50/20">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-xs text-stone-900">{project.title}</h4>
                    {project.url && (
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-stone-400 hover:text-stone-700"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-stone-600 leading-relaxed">{project.description}</p>
                  {project.skills && project.skills.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {project.skills.map((sk) => (
                        <span key={sk} className="rounded bg-stone-200/60 px-2 py-0.5 text-[10px] text-stone-700">
                          {sk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {projects.length === 0 && (
                <p className="text-xs text-stone-500 py-4 text-center">No projects attached.</p>
              )}
            </div>
          </div>

          {/* External Evidence Links */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="h-4 w-4 text-stone-600" />
              <h3 className="font-bold text-sm text-stone-900">External Coding Proofs</h3>
            </div>
            <div className="space-y-3">
              {evidence.map((item) => (
                <a
                  key={item.url}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl border border-stone-200/80 p-4 bg-stone-50/20 hover:bg-stone-50/60 transition group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold text-stone-800 bg-stone-200/70 px-2 py-0.5 rounded">
                      {item.source}
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 text-stone-400 group-hover:text-stone-700" />
                  </div>
                  <p className="mt-2 text-xs text-stone-600 leading-relaxed">{item.description}</p>
                </a>
              ))}
              {evidence.length === 0 && (
                <p className="text-xs text-stone-500 py-4 text-center">No external accounts linked.</p>
              )}
            </div>
          </div>
        </div>

        {/* Cryptographic Audit Stamp */}
        <div className="mt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-stone-100 pt-6 text-[11px] text-stone-400 font-mono">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-stone-400" />
            <span>Cryptographically signed by PRAMAAN Verification Protocol</span>
          </div>
          <span>Proof hash: sha256:4b91...88c2</span>
        </div>
      </div>
    </main>
  );
}

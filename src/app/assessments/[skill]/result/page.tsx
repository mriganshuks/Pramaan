import Link from "next/link";

type ResultPageProps = { params: Promise<{ skill: string }> };

export default async function AssessmentResultPage({ params }: ResultPageProps) {
  const { skill } = await params;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Assessment result</p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900">{decodeURIComponent(skill)}</h1>
      <p className="mt-4 text-sm leading-6 text-stone-600">Completed assessment results are stored by attempt ID and returned immediately after submission. Start a new assessment or open your dashboard to view the latest skill status.</p>
      <div className="mt-6 flex gap-3">
        <Link href={`/assessments/${encodeURIComponent(skill)}`} className="inline-flex h-10 items-center border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50">Start assessment</Link>
        <Link href="/dashboard" className="inline-flex h-10 items-center border border-stone-400 px-4 text-sm">Return to dashboard</Link>
      </div>
    </main>
  );
}

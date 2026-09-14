import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-6 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">
        From verified skills to real opportunities
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-stone-900">
        Prove your skills. Build stronger teams.
      </h1>
      <p className="mt-4 max-w-lg text-base leading-7 text-stone-600">
        PRAMAAN turns skill claims into evidence-backed profiles and helps
        hackathon participants find teammates with verified, complementary
        skills.
      </p>
      <div className="mt-10 flex flex-wrap gap-3 border-t border-stone-300 pt-8">
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center border border-stone-900 bg-stone-900 px-5 text-sm font-medium text-stone-50 hover:bg-stone-800"
        >
          Explore the dashboard
        </Link>
        <Link
          href="/dashboard#skills"
          className="inline-flex h-11 items-center border border-stone-400 px-5 text-sm font-medium text-stone-800 hover:bg-stone-100"
        >
          View verified skills
        </Link>
      </div>
    </main>
  );
}

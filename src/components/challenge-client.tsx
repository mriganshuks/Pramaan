"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Question = { id: string; prompt: string; topic: string; options: Array<{ id: "A" | "B" | "C" | "D"; text: string }> };
type ChallengeResult = {
  id: string;
  state: string;
  skill: string;
  score: { correct: number; total: number; percentage: number };
  integrity: { score: number; riskLevel: string; eventCount: number };
  completedAt: string | null;
};

type ChallengeClientProps = { challengeId: string };

export default function ChallengeClient({ challengeId }: ChallengeClientProps) {
  const [skill, setSkill] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<ChallengeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let current = true;
    async function start() {
      try {
        const existingResponse = await fetch(`/api/challenges/${challengeId}`);
        const existing = await existingResponse.json();
        if (!existingResponse.ok) throw new Error(existing.error?.message ?? "Unable to load challenge.");
        const data = existing.challenge.state === "SENT" ? (await (await fetch(`/api/challenges/${challengeId}/start`, { method: "POST" })).json()) as {
          challenge?: { skill: string; questions?: Question[] };
          error?: { message?: string };
        } : existing as {
          challenge?: { skill: string; questions?: Question[] };
          error?: { message?: string };
        };
        if (!data.challenge?.questions) {
          throw new Error(data.error?.message ?? "Unable to start challenge.");
        }
        if (current) {
          setSkill(data.challenge.skill);
          setQuestions(data.challenge.questions);
        }
      } catch (startError) {
        if (current) setError(startError instanceof Error ? startError.message : "Unable to start challenge.");
      } finally {
        if (current) setLoading(false);
      }
    }
    void start();
    return () => { current = false; };
  }, [challengeId]);

  async function submit() {
    if (submitting || result) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/challenges/${challengeId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const data = (await response.json()) as { result?: ChallengeResult; error?: { message?: string } };
      if (!response.ok || !data.result) throw new Error(data.error?.message ?? "Unable to submit challenge.");
      setResult(data.result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to submit challenge.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-6 py-10 text-sm text-stone-600">Starting skill challenge...</main>;
  }

  if (error && questions.length === 0) {
    return <main className="mx-auto max-w-3xl px-6 py-10"><p className="text-sm text-red-700">{error}</p><Link href="/teammates" className="mt-5 inline-block text-sm underline underline-offset-4">Return to teammates</Link></main>;
  }

  if (result) {
    return (
      <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">Challenge result</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">{result.skill}</h1>
        <div className="mt-10 border-y border-stone-300 py-8">
          <p className="text-sm text-stone-600">Score</p>
          <p className="mt-1 text-4xl font-semibold text-stone-900">{result.score.correct} / {result.score.total}</p>
          <p className="mt-5 text-sm text-stone-600">Assessment</p>
          <p className="mt-1 text-2xl font-semibold text-stone-900">{result.score.percentage}%</p>
          <p className="mt-5 text-sm text-stone-600">Integrity</p>
          <p className="mt-1 text-lg font-semibold text-stone-900">{result.integrity.score}/100 · {result.integrity.riskLevel.toLowerCase()} risk</p>
        </div>
        <Link href="/team" className="mt-6 inline-flex h-10 w-fit items-center border border-stone-900 bg-stone-900 px-4 text-sm font-medium text-stone-50">Review team decision</Link>
      </main>
    );
  }

  const question = questions[index];
  const selected = answers[question.id];
  const last = index === questions.length - 1;

  return (
    <main className="mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-500">{skill} mini challenge</p>
      <div className="mt-3 flex justify-between gap-4"><h1 className="text-3xl font-semibold text-stone-900">Complete team challenge</h1><p className="text-sm text-stone-600">Question {index + 1} of {questions.length}</p></div>
      <section className="mt-10 border-y border-stone-300 py-8">
        <div className="flex justify-between gap-4 text-sm text-stone-600"><span>{question.topic}</span></div>
        <h2 className="mt-4 text-xl font-medium leading-8 text-stone-900">{question.prompt}</h2>
        <fieldset className="mt-8 grid gap-3"><legend className="sr-only">Challenge answer choices</legend>{question.options.map((option) => <label key={option.id} className="flex cursor-pointer gap-3 border border-stone-300 p-4 text-sm hover:bg-stone-100"><input type="radio" name={question.id} checked={selected === option.id} onChange={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))} /><span><strong>{option.id}.</strong> {option.text}</span></label>)}</fieldset>
      </section>
      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-between gap-3"><button type="button" disabled={index === 0 || submitting} onClick={() => setIndex((value) => Math.max(0, value - 1))} className="h-10 border border-stone-400 px-4 text-sm disabled:opacity-40">Previous</button>{last ? <button type="button" disabled={submitting || Object.keys(answers).length !== questions.length} onClick={() => void submit()} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-40">{submitting ? "Submitting..." : "Submit challenge"}</button> : <button type="button" disabled={submitting} onClick={() => setIndex((value) => Math.min(questions.length - 1, value + 1))} className="h-10 border border-stone-900 bg-stone-900 px-4 text-sm text-stone-50 disabled:opacity-40">Next</button>}</div>
    </main>
  );
}

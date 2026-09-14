import type { CodingProblem, PublicCodingProblem, PublicQuestion } from "@/lib/assessment-types";

export function publicQuestions(questions: unknown): PublicQuestion[] {
  const values = questions as Array<{ id: string; prompt: string; topic: string; options: Array<{ id: string; text: string }> }>;
  return Array.from(values).map((question) => ({ id: question.id, prompt: question.prompt, topic: question.topic, options: Array.from(question.options).map((option) => ({ id: option.id as PublicQuestion["options"][number]["id"], text: option.text })) }));
}

export function publicCodingProblem(problem: CodingProblem): PublicCodingProblem {
  const publicProblem = { ...problem };
  delete (publicProblem as Partial<CodingProblem>).hiddenTests;
  return publicProblem;
}

export function serializeProfile(profile: {
  _id: { toString(): string };
  displayName: string;
  email?: string;
  handle: string;
  headline: string;
  bio: string;
  location: string;
  education: string;
  availableForTeams: boolean;
  skills: unknown[];
  projects: unknown[];
  evidence: unknown[];
}) {
  return { id: profile._id.toString(), displayName: profile.displayName, email: profile.email, handle: profile.handle, headline: profile.headline, bio: profile.bio, location: profile.location, education: profile.education, availableForTeams: profile.availableForTeams, skills: profile.skills, projects: profile.projects, evidence: profile.evidence };
}

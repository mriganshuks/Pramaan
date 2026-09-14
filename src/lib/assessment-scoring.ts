import type { IntegrityEventType, RiskLevel, VerificationStatus } from "@/lib/assessment-types";

const WEIGHTS: Record<IntegrityEventType, number> = {
  TAB_HIDDEN: 14,
  WINDOW_BLUR: 7,
  WINDOW_FOCUS: 0,
  FULLSCREEN_EXIT: 8,
  CAMERA_DISABLED: 18,
  MICROPHONE_DISABLED: 12,
  CAMERA_PERMISSION_LOST: 18,
  MICROPHONE_PERMISSION_LOST: 12,
  COPY_ATTEMPT: 3,
  PASTE_ATTEMPT: 3,
  NETWORK_DISCONNECT: 2,
  REPEATED_SUBMISSION: 8,
  NO_FACE_DETECTED: 10,
  MULTIPLE_FACES_DETECTED: 18,
};

export function scoreMcq(
  answers: Record<string, string>,
  questions: Array<{ id: string; correctOption: string }>
) {
  const correct = questions.filter((question) => answers[question.id] === question.correctOption).length;
  return { correct, total: questions.length, percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
}

export function integritySummary(events: Array<{ type: IntegrityEventType; severity: string }>) {
  const deduction = events.reduce((total, event) => total + (WEIGHTS[event.type] ?? 0), 0);
  const score = Math.max(0, 100 - deduction);
  const highCount = events.filter((event) => event.severity === "HIGH").length;
  const riskLevel: RiskLevel = score < 60 || highCount >= 2 || events.length >= 7 ? "HIGH" : score < 82 || highCount >= 1 || events.length >= 3 ? "MEDIUM" : "LOW";
  return { score, riskLevel, eventCount: events.length };
}

export function verificationFor(input: { score: number; integrityRisk: RiskLevel; evidenceCount: number }): VerificationStatus {
  if (input.integrityRisk === "HIGH") return input.score >= 90 ? "PARTIALLY_VERIFIED" : "NOT_VERIFIED";
  if (input.score >= Number(process.env.PRAMAAN_VERIFIED_THRESHOLD ?? 90)) return "VERIFIED";
  if (input.score >= Number(process.env.PRAMAAN_PARTIAL_THRESHOLD ?? 70)) return "PARTIALLY_VERIFIED";
  return "NOT_VERIFIED";
}

export function topicPerformance(answers: Record<string, string>, questions: Array<{ id: string; topic: string; correctOption: string }>) {
  const topics = new Map<string, { topic: string; total: number; correct: number }>();
  for (const question of questions) {
    const current = topics.get(question.topic) ?? { topic: question.topic, total: 0, correct: 0 };
    current.total += 1;
    if (answers[question.id] === question.correctOption) current.correct += 1;
    topics.set(question.topic, current);
  }
  return [...topics.values()];
}

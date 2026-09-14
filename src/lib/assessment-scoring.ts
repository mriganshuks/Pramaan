import type {
  IntegrityEventType,
  IntegritySummary,
  RiskLevel,
  VerificationStatus,
  ViolationLevel,
  ViolationStatus,
} from "@/lib/assessment-types";

const WEIGHTS: Record<IntegrityEventType, number> = {
  TAB_HIDDEN: 15,
  WINDOW_BLUR: 8,
  WINDOW_FOCUS: 0,
  FULLSCREEN_EXIT: 12,
  CAMERA_DISABLED: 20,
  MICROPHONE_DISABLED: 12,
  CAMERA_PERMISSION_LOST: 20,
  MICROPHONE_PERMISSION_LOST: 12,
  CAMERA_DISCONNECT: 15,
  COPY_ATTEMPT: 5,
  PASTE_ATTEMPT: 5,
  NETWORK_DISCONNECT: 3,
  REPEATED_SUBMISSION: 8,
  NO_FACE_DETECTED: 12,
  MULTIPLE_FACES_DETECTED: 22,
  PHONE_DETECTED: 25,
  EXCESSIVE_HEAD_MOVEMENT: 10,
  EXCESSIVE_GAZE: 8,
};

// Events that can trigger confirmed violations
const VIOLATION_TRIGGER_TYPES = new Set<IntegrityEventType>([
  "TAB_HIDDEN",
  "FULLSCREEN_EXIT",
  "MULTIPLE_FACES_DETECTED",
  "PHONE_DETECTED",
  "CAMERA_DISABLED",
  "CAMERA_PERMISSION_LOST",
  "CAMERA_DISCONNECT",
  "NO_FACE_DETECTED",
  "EXCESSIVE_HEAD_MOVEMENT",
]);

export function scoreMcq(
  answers: Record<string, string>,
  questions: Array<{ id: string; correctOption: string }>
) {
  const correct = questions.filter((question) => answers[question.id] === question.correctOption).length;
  return { correct, total: questions.length, percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0 };
}

/**
 * Groups raw integrity events into confirmed violation episodes to avoid
 * counting every raw video frame as a separate violation.
 * Debounces events of the same trigger type occurring within 10 seconds.
 */
export function calculateConfirmedViolations(
  events: Array<{ type: IntegrityEventType; severity: string; timestamp?: Date }>
): {
  violationCount: number;
  violationLevel: ViolationLevel;
  status: ViolationStatus;
  warningMessage: string | null;
  terminated: boolean;
} {
  const violationEvents = events
    .filter((event) => {
      if (!VIOLATION_TRIGGER_TYPES.has(event.type)) return false;
      // High severity always counts; medium severity counts for explicit navigation/face violations
      if (event.severity === "HIGH") return true;
      if (event.type === "TAB_HIDDEN" || event.type === "FULLSCREEN_EXIT") return true;
      if (event.type === "MULTIPLE_FACES_DETECTED" || event.type === "PHONE_DETECTED") return true;
      return false;
    })
    .sort((a, b) => (new Date(a.timestamp ?? 0).getTime()) - (new Date(b.timestamp ?? 0).getTime()));

  // Debounce consecutive events of the same type within 10 seconds
  const distinctEpisodes: Array<{ type: IntegrityEventType; time: number }> = [];
  for (const event of violationEvents) {
    const time = new Date(event.timestamp ?? 0).getTime();
    const last = distinctEpisodes[distinctEpisodes.length - 1];
    if (last && last.type === event.type && Math.abs(time - last.time) < 10_000) {
      continue;
    }
    distinctEpisodes.push({ type: event.type, time });
  }

  const count = distinctEpisodes.length;
  if (count === 0) {
    return {
      violationCount: 0,
      violationLevel: 0,
      status: "NORMAL",
      warningMessage: null,
      terminated: false,
    };
  }

  if (count === 1) {
    return {
      violationCount: 1,
      violationLevel: 1,
      status: "WARNING",
      warningMessage: "Warning 1/3: Proctoring violation detected. Please stay in fullscreen and keep your face visible and centered.",
      terminated: false,
    };
  }

  if (count === 2) {
    return {
      violationCount: 2,
      violationLevel: 2,
      status: "FINAL_WARNING",
      warningMessage: "Final Warning 2/3: Continued integrity violations recorded. One more violation will immediately lock and terminate your assessment.",
      terminated: false,
    };
  }

  return {
    violationCount: count,
    violationLevel: 3,
    status: "TERMINATED",
    warningMessage: "Assessment Terminated (3/3): Multiple confirmed proctoring violations were recorded. The assessment has been locked and recorded for review.",
    terminated: true,
  };
}

export function integritySummary(
  events: Array<{ type: IntegrityEventType; severity: string; timestamp?: Date }>
): IntegritySummary {
  const deduction = events.reduce((total, event) => total + (WEIGHTS[event.type] ?? 0), 0);
  const violationData = calculateConfirmedViolations(events);

  // If terminated, clamp integrity score to severe penalty
  const rawScore = Math.max(0, 100 - deduction);
  const score = violationData.terminated ? Math.min(rawScore, 30) : rawScore;

  const highCount = events.filter((event) => event.severity === "HIGH").length;
  const riskLevel: RiskLevel =
    violationData.terminated || score < 60 || highCount >= 2 || events.length >= 7
      ? "HIGH"
      : score < 82 || highCount >= 1 || events.length >= 3
        ? "MEDIUM"
        : "LOW";

  return {
    score,
    riskLevel,
    eventCount: events.length,
    violationCount: violationData.violationCount,
    violationLevel: violationData.violationLevel,
    status: violationData.status,
    warningMessage: violationData.warningMessage,
    terminated: violationData.terminated,
  };
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

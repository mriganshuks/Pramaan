export const ASSESSMENT_DURATION_SECONDS = 28 * 60;
export const CHALLENGE_DURATION_SECONDS = 12 * 60;

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type OptionId = "A" | "B" | "C" | "D";
export type AssessmentOption = { id: OptionId; text: string };
export type AssessmentQuestion = {
  id: string;
  prompt: string;
  topic: string;
  options: AssessmentOption[];
  correctOption: OptionId;
  explanation: string;
  fingerprint: string;
};
export type PublicQuestion = Omit<AssessmentQuestion, "correctOption" | "explanation" | "fingerprint">;
export type CodingProblem = {
  id: string;
  title: string;
  statement: string;
  constraints: string[];
  examples: Array<{ input: string; output: string }>;
  starterCode: string;
  language: "javascript";
  hiddenTests: Array<{ input: unknown; expected: unknown }>;
};
export type PublicCodingProblem = Omit<CodingProblem, "hiddenTests">;
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type VerificationStatus = "NOT_VERIFIED" | "PARTIALLY_VERIFIED" | "VERIFIED";
export type SkillStatus = "CLAIMED" | VerificationStatus;
export type PerformanceAnalysis = {
  overallUnderstanding: string;
  strengths: string[];
  weaknesses: string[];
  improvementAreas: string[];
  topicInsights: Array<{ topic: string; summary: string }>;
};
export type IntegrityEventType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS"
  | "FULLSCREEN_EXIT"
  | "CAMERA_DISABLED"
  | "MICROPHONE_DISABLED"
  | "CAMERA_PERMISSION_LOST"
  | "MICROPHONE_PERMISSION_LOST"
  | "CAMERA_DISCONNECT"
  | "COPY_ATTEMPT"
  | "PASTE_ATTEMPT"
  | "NETWORK_DISCONNECT"
  | "REPEATED_SUBMISSION"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "PHONE_DETECTED"
  | "EXCESSIVE_HEAD_MOVEMENT"
  | "EXCESSIVE_GAZE";
export type IntegritySeverity = "LOW" | "MEDIUM" | "HIGH";

export type ViolationLevel = 0 | 1 | 2 | 3;
export type ViolationStatus = "NORMAL" | "WARNING" | "FINAL_WARNING" | "TERMINATED";

export type IntegritySummary = {
  score: number;
  riskLevel: RiskLevel;
  eventCount: number;
  violationCount: number;
  violationLevel: ViolationLevel;
  status: ViolationStatus;
  warningMessage: string | null;
  terminated: boolean;
};

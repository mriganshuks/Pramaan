import mongoose from "mongoose";
import { AssessmentAttempt } from "@/models/AssessmentAttempt";
import { IntegrityEvent } from "@/models/IntegrityEvent";
import { User } from "@/models/User";
import { ApiError } from "@/lib/api";
import { isDatabaseConnected } from "@/lib/mongodb";
import {
  memoryCreateAssessmentAttempt,
  memoryGetAssessmentAttempt,
  memoryGetAssessmentResult,
  memoryRecordAssessmentIntegrity,
  memorySubmitAssessmentAttempt,
} from "@/lib/memory-store";
import { analyzeAssessmentPerformance, generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq, topicPerformance, verificationFor } from "@/lib/assessment-scoring";
import { evaluateCodeSafely } from "@/lib/safe-code-execution";
import { publicCodingProblem, publicQuestions } from "@/lib/serializers";
import { ASSESSMENT_DURATION_SECONDS, type Difficulty, type IntegrityEventType } from "@/lib/assessment-types";

function objectId(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new ApiError("The requested record was not found.", 404, "NOT_FOUND");
  return new mongoose.Types.ObjectId(value);
}

export function publicAttempt(attempt: {
  _id: { toString(): string };
  skill: string;
  difficulty: string;
  state: string;
  questions: Array<{ id: string; prompt: string; topic: string; options: Array<{ id: string; text: string }> }>;
  codingProblem: unknown;
  startedAt: Date;
  expiresAt: Date;
  generatedBy: string;
  generationNotice?: string | null;
}) {
  return { id: attempt._id.toString(), skill: attempt.skill, difficulty: attempt.difficulty, state: attempt.state, questions: publicQuestions(attempt.questions), codingProblem: publicCodingProblem(attempt.codingProblem as Parameters<typeof publicCodingProblem>[0]), startedAt: attempt.startedAt.toISOString(), expiresAt: attempt.expiresAt.toISOString(), generatedBy: attempt.generatedBy, notice: attempt.generationNotice };
}

export async function createAssessmentAttempt(input: { profileId: string; skill: string; difficulty: Difficulty }) {
  if (!isDatabaseConnected()) {
    return memoryCreateAssessmentAttempt(input);
  }
  const profileId = objectId(input.profileId);
  const profile = await User.findById(profileId).select("_id").lean();
  if (!profile) throw new ApiError("Create a profile before starting an assessment.", 404, "PROFILE_NOT_FOUND");
  const skill = input.skill.trim().replace(/\s+/g, " ");
  if (skill.length < 2 || skill.length > 80) throw new ApiError("Choose a valid skill.", 400, "INVALID_SKILL");
  const prior = await AssessmentAttempt.find({ profileId, skill: new RegExp(`^${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("questions.fingerprint").sort({ createdAt: -1 }).limit(5).lean();
  const previousFingerprints = prior.flatMap((attempt) => attempt.questions.map((question) => question.fingerprint));
  const generated = await generateAssessment({ skill, difficulty: input.difficulty, count: 5, previousFingerprints });
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);
  const attempt = await AssessmentAttempt.create({ profileId, skill, difficulty: input.difficulty, state: "IN_PROGRESS", startedAt, expiresAt, questions: generated.questions, codingProblem: generated.codingProblem, generatedBy: generated.generatedBy, generationNotice: generated.notice });
  return publicAttempt(attempt);
}

export async function getAssessmentAttempt(profileId: string, attemptId: string) {
  if (!isDatabaseConnected()) {
    return memoryGetAssessmentAttempt(profileId, attemptId);
  }
  const attempt = await AssessmentAttempt.findOne({ _id: objectId(attemptId), profileId: objectId(profileId) }).lean();
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  return publicAttempt(attempt);
}

export async function recordAssessmentIntegrity(input: { profileId: string; attemptId: string; events: Array<{ type: IntegrityEventType; severity: "LOW" | "MEDIUM" | "HIGH"; timestamp?: Date; metadata?: Record<string, string | number | boolean> }> }) {
  if (!isDatabaseConnected()) {
    return memoryRecordAssessmentIntegrity(input);
  }
  const targetId = objectId(input.attemptId);
  const profileObjectId = objectId(input.profileId);
  const attempt = await AssessmentAttempt.findOne({ _id: targetId, profileId: profileObjectId });
  if (!attempt || attempt.state !== "IN_PROGRESS") {
    throw new ApiError("This assessment can no longer receive integrity events.", 409, "INVALID_STATE");
  }

  await IntegrityEvent.insertMany(
    input.events.map((event) => ({
      targetId,
      targetType: "ASSESSMENT",
      profileId: profileObjectId,
      type: event.type,
      severity: event.severity,
      timestamp: event.timestamp ?? new Date(),
      metadata: event.metadata,
    })),
    { ordered: false }
  );

  const allEvents = await IntegrityEvent.find({ targetId }).lean();
  const summary = integritySummary(allEvents as Array<{ type: IntegrityEventType; severity: string; timestamp?: Date }>);

  // If 3 confirmed violations reached, server enforces immediate termination
  if (summary.terminated) {
    attempt.state = "FAILED";
    attempt.integrityScore = summary.score;
    attempt.riskLevel = "HIGH";
    attempt.verificationStatus = "NOT_VERIFIED";
    attempt.submittedAt = new Date();
    await attempt.save();
  }

  return summary;
}

export async function submitAssessmentAttempt(input: { profileId: string; attemptId: string; answers: Record<string, string>; codingSubmission: string; timeout: boolean }) {
  if (!isDatabaseConnected()) {
    return memorySubmitAssessmentAttempt(input);
  }
  const profileObjectId = objectId(input.profileId);
  const attemptId = objectId(input.attemptId);
  const attempt = await AssessmentAttempt.findOneAndUpdate(
    { _id: attemptId, profileId: profileObjectId, state: "IN_PROGRESS" },
    { $set: { state: "EVALUATING", submittedAt: new Date() } },
    { new: true }
  ).select("+questions.correctOption +questions.explanation");
  if (!attempt) {
    const existing = await AssessmentAttempt.findOne({ _id: attemptId, profileId: profileObjectId }).lean();
    if (!existing) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
    if (existing.state === "FAILED") {
      throw new ApiError("This assessment was terminated due to confirmed proctoring violations.", 403, "ASSESSMENT_TERMINATED");
    }
    throw new ApiError("This assessment was already submitted or is being evaluated.", 409, "DUPLICATE_SUBMISSION");
  }
  const expired = Date.now() > attempt.expiresAt.getTime();
  const acceptedAnswers = expired && !input.timeout ? {} : input.answers;
  const mcq = scoreMcq(acceptedAnswers, attempt.questions);
  const topics = topicPerformance(acceptedAnswers, attempt.questions);
  const events = await IntegrityEvent.find({ targetId: attemptId }).lean();
  const integrity = integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>);
  const coding = input.codingSubmission.trim() && !expired ? await evaluateCodeSafely({ sourceCode: input.codingSubmission, problem: attempt.codingProblem as Parameters<typeof evaluateCodeSafely>[0]["problem"] }) : { status: "UNAVAILABLE" as const, message: expired ? "The coding submission arrived after the assessment deadline and was not evaluated." : "No coding submission was provided." };
  const finalScore = coding.status === "COMPLETED" ? Math.round(mcq.percentage * 0.7 + coding.score * 0.3) : mcq.percentage;
  const profile = await User.findById(profileObjectId).select("skills evidence");
  if (!profile) throw new ApiError("Profile not found.", 404, "PROFILE_NOT_FOUND");
  const normalized = attempt.skill.toLowerCase();
  const skill = profile.skills.find((item) => item.normalizedName === normalized);
  const evidenceCount = (skill?.evidenceCount ?? 0) + profile.evidence.filter((entry) => entry.skills.some((name) => name.toLowerCase() === normalized)).length;
  const verificationStatus = verificationFor({ score: finalScore, integrityRisk: integrity.riskLevel, evidenceCount });
  const performanceAnalysis = await analyzeAssessmentPerformance({
    skill: attempt.skill,
    difficulty: attempt.difficulty as Difficulty,
    score: finalScore,
    mcq,
    topics,
    integrityRisk: integrity.riskLevel,
  });
  const receipt = {
    verificationId: `prm_${attempt._id.toString()}`,
    userId: profileObjectId.toString(),
    skill: attempt.skill,
    assessmentId: attempt._id.toString(),
    attemptId: attempt._id.toString(),
    score: finalScore,
    verificationStatus,
    assessmentDate: new Date().toISOString(),
    assessmentType: "SECURE_SKILL_ASSESSMENT",
    evidenceSource: "OpenAI-generated assessment with server-side scoring",
    security: {
      riskLevel: integrity.riskLevel,
      integrityScore: integrity.score,
      eventCount: integrity.eventCount,
    },
  };
  if (skill) {
    skill.assessmentScore = Math.max(skill.assessmentScore ?? 0, finalScore);
    skill.status = verificationStatus;
    skill.evidenceCount = evidenceCount;
    skill.lastAssessmentAt = new Date();
  } else {
    profile.skills.push({ name: attempt.skill, normalizedName: normalized, status: verificationStatus, assessmentScore: finalScore, evidenceCount, lastAssessmentAt: new Date() });
  }
  await profile.save();
  attempt.answers = new Map(Object.entries(acceptedAnswers));
  attempt.codingSubmission = input.codingSubmission.slice(0, 30000);
  attempt.mcqScore = mcq.percentage;
  attempt.codingScore = coding.status === "COMPLETED" ? coding.score : undefined;
  attempt.codingEvaluation = coding;
  attempt.integrityScore = integrity.score;
  attempt.finalScore = finalScore;
  attempt.riskLevel = integrity.riskLevel;
  attempt.verificationStatus = verificationStatus;
  attempt.topicPerformance = topics;
  attempt.performanceAnalysis = performanceAnalysis;
  attempt.verificationReceipt = receipt;
  attempt.state = expired ? "TIMED_OUT" : "COMPLETED";
  await attempt.save();
  return { id: attempt._id.toString(), skill: attempt.skill, state: attempt.state, mcq, coding, integrity, finalScore, verificationStatus, topicPerformance: topics, performanceAnalysis, verificationReceipt: receipt, completedAt: attempt.submittedAt?.toISOString() ?? null };
}

export async function getAssessmentResult(profileId: string, attemptId: string) {
  if (!isDatabaseConnected()) {
    return memoryGetAssessmentResult(profileId, attemptId);
  }
  const attempt = await AssessmentAttempt.findOne({ _id: objectId(attemptId), profileId: objectId(profileId) }).lean();
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  if (!attempt.finalScore && attempt.finalScore !== 0) throw new ApiError("This assessment has not been completed.", 409, "NOT_COMPLETE");
  const events = await IntegrityEvent.find({ targetId: attempt._id }).lean();
  return { id: attempt._id.toString(), skill: attempt.skill, state: attempt.state, mcq: { percentage: attempt.mcqScore ?? 0, total: attempt.questions.length, correct: Math.round(((attempt.mcqScore ?? 0) / 100) * attempt.questions.length) }, coding: attempt.codingEvaluation, integrity: integritySummary(events as Array<{ type: IntegrityEventType; severity: string }>), finalScore: attempt.finalScore, verificationStatus: attempt.verificationStatus, topicPerformance: attempt.topicPerformance, performanceAnalysis: attempt.performanceAnalysis, verificationReceipt: attempt.verificationReceipt, completedAt: attempt.submittedAt?.toISOString() ?? null };
}

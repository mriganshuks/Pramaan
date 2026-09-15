import { ApiError } from "@/lib/api";
import { getSupabaseAdminClient, handleSupabaseError, requireValidUuid } from "@/lib/supabase/admin";
import { analyzeAssessmentPerformance, generateAssessment } from "@/lib/assessment-generation";
import { integritySummary, scoreMcq, topicPerformance, verificationFor } from "@/lib/assessment-scoring";
import { evaluateCodeSafely } from "@/lib/safe-code-execution";
import { publicCodingProblem, publicQuestions } from "@/lib/serializers";
import { ASSESSMENT_DURATION_SECONDS, type Difficulty, type IntegrityEventType } from "@/lib/assessment-types";

function validUuid(value: string, name = "record"): string {
  return requireValidUuid(value, name);
}

export function publicAttempt(attempt: {
  id: string;
  skill: string;
  difficulty: string;
  state: string;
  questions: unknown;
  coding_problem?: unknown;
  codingProblem?: unknown;
  started_at?: string | Date;
  startedAt?: string | Date;
  expires_at?: string | Date;
  expiresAt?: string | Date;
  generated_by?: string;
  generatedBy?: string;
  generation_notice?: string | null;
  generationNotice?: string | null;
}) {
  const started = attempt.started_at || attempt.startedAt || new Date();
  const expires = attempt.expires_at || attempt.expiresAt || new Date();
  const codingProblem = attempt.coding_problem ?? attempt.codingProblem;
  const generatedBy = attempt.generated_by ?? attempt.generatedBy ?? "openai";
  const notice = attempt.generation_notice !== undefined ? attempt.generation_notice : attempt.generationNotice;

  return {
    id: attempt.id,
    skill: attempt.skill,
    difficulty: attempt.difficulty,
    state: attempt.state,
    questions: publicQuestions(attempt.questions),
    codingProblem: publicCodingProblem(codingProblem as Parameters<typeof publicCodingProblem>[0]),
    startedAt: new Date(started).toISOString(),
    expiresAt: new Date(expires).toISOString(),
    generatedBy,
    notice,
  };
}

export async function createAssessmentAttempt(input: { profileId: string; skill: string; difficulty: Difficulty }) {
  const profileId = validUuid(input.profileId, "profile");
  const skill = input.skill.trim().replace(/\s+/g, " ");
  if (skill.length < 2 || skill.length > 80) {
    throw new ApiError("Choose a valid skill.", 400, "INVALID_SKILL");
  }

  const supabase = getSupabaseAdminClient();

  // Verify profile exists
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", profileId)
    .maybeSingle();

  if (profileErr) handleSupabaseError(profileErr, "Failed to verify profile");
  if (!profile) throw new ApiError("Create a profile before starting an assessment.", 404, "PROFILE_NOT_FOUND");

  // Query prior attempts to avoid duplicate questions
  const { data: priorAttempts } = await supabase
    .from("assessment_attempts")
    .select("questions")
    .eq("profile_id", profileId)
    .ilike("skill", skill)
    .order("created_at", { ascending: false })
    .limit(5);

  const previousFingerprints: string[] = [];
  if (priorAttempts) {
    for (const att of priorAttempts) {
      if (Array.isArray(att.questions)) {
        for (const q of att.questions) {
          if (q && typeof q.fingerprint === "string") {
            previousFingerprints.push(q.fingerprint);
          }
        }
      }
    }
  }

  const generated = await generateAssessment({
    skill,
    difficulty: input.difficulty,
    count: 5,
    previousFingerprints,
  });

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + ASSESSMENT_DURATION_SECONDS * 1000);

  const { data: newAttempt, error: insertErr } = await supabase
    .from("assessment_attempts")
    .insert({
      profile_id: profileId,
      skill,
      difficulty: input.difficulty,
      state: "IN_PROGRESS",
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      questions: generated.questions,
      coding_problem: generated.codingProblem,
      generated_by: generated.generatedBy,
      generation_notice: generated.notice,
    })
    .select()
    .single();

  if (insertErr) handleSupabaseError(insertErr, "Failed to create assessment attempt");

  return publicAttempt(newAttempt);
}

export async function getAssessmentAttempt(profileId: string, attemptId: string) {
  const validProfile = validUuid(profileId, "profile");
  const validAttempt = validUuid(attemptId, "assessment attempt");
  const supabase = getSupabaseAdminClient();

  const { data: attempt, error } = await supabase
    .from("assessment_attempts")
    .select()
    .eq("id", validAttempt)
    .eq("profile_id", validProfile)
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to fetch assessment attempt");
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");

  return publicAttempt(attempt);
}

export async function recordAssessmentIntegrity(input: {
  profileId: string;
  attemptId: string;
  events: Array<{
    type: IntegrityEventType;
    severity: "LOW" | "MEDIUM" | "HIGH";
    timestamp?: Date;
    metadata?: Record<string, string | number | boolean>;
  }>;
}) {
  const profileId = validUuid(input.profileId, "profile");
  const attemptId = validUuid(input.attemptId, "assessment attempt");
  const supabase = getSupabaseAdminClient();

  const { data: attempt, error: attemptErr } = await supabase
    .from("assessment_attempts")
    .select("id, state")
    .eq("id", attemptId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (attemptErr) handleSupabaseError(attemptErr, "Failed to load assessment attempt");
  if (!attempt || attempt.state !== "IN_PROGRESS") {
    throw new ApiError("This assessment can no longer receive integrity events.", 409, "INVALID_STATE");
  }

  if (input.events.length > 0) {
    const rows = input.events.map((event) => ({
      target_id: attemptId,
      target_type: "ASSESSMENT",
      profile_id: profileId,
      type: event.type,
      severity: event.severity,
      timestamp: (event.timestamp ?? new Date()).toISOString(),
      metadata: event.metadata ?? {},
    }));

    const { error: insertEventsErr } = await supabase.from("integrity_events").insert(rows);
    if (insertEventsErr) handleSupabaseError(insertEventsErr, "Failed to log integrity events");
  }

  const { data: allEvents, error: fetchErr } = await supabase
    .from("integrity_events")
    .select("type, severity, timestamp")
    .eq("target_id", attemptId);

  if (fetchErr) handleSupabaseError(fetchErr, "Failed to load integrity events");

  const summary = integritySummary(
    (allEvents ?? []).map((e) => ({
      type: e.type as IntegrityEventType,
      severity: e.severity,
      timestamp: e.timestamp ? new Date(e.timestamp) : undefined,
    }))
  );

  if (summary.terminated) {
    await supabase
      .from("assessment_attempts")
      .update({
        state: "FAILED",
        integrity_score: summary.score,
        risk_level: "HIGH",
        verification_status: "NOT_VERIFIED",
        submitted_at: new Date().toISOString(),
      })
      .eq("id", attemptId);
  }

  return summary;
}

export async function submitAssessmentAttempt(input: {
  profileId: string;
  attemptId: string;
  answers: Record<string, string>;
  codingSubmission: string;
  timeout: boolean;
}) {
  const profileId = validUuid(input.profileId, "profile");
  const attemptId = validUuid(input.attemptId, "assessment attempt");
  const supabase = getSupabaseAdminClient();

  // Transition state from IN_PROGRESS to EVALUATING
  const { data: attempt, error: updateErr } = await supabase
    .from("assessment_attempts")
    .update({
      state: "EVALUATING",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("profile_id", profileId)
    .eq("state", "IN_PROGRESS")
    .select()
    .maybeSingle();

  if (updateErr) handleSupabaseError(updateErr, "Failed to submit assessment");

  if (!attempt) {
    const { data: existing } = await supabase
      .from("assessment_attempts")
      .select("state")
      .eq("id", attemptId)
      .eq("profile_id", profileId)
      .maybeSingle();

    if (!existing) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
    if (existing.state === "FAILED") {
      throw new ApiError("This assessment was terminated due to confirmed proctoring violations.", 403, "ASSESSMENT_TERMINATED");
    }
    throw new ApiError("This assessment was already submitted or is being evaluated.", 409, "DUPLICATE_SUBMISSION");
  }

  const expiresAt = new Date(attempt.expires_at).getTime();
  const expired = Date.now() > expiresAt;
  const acceptedAnswers = expired && !input.timeout ? {} : input.answers;

  const mcq = scoreMcq(acceptedAnswers, attempt.questions);
  const topics = topicPerformance(acceptedAnswers, attempt.questions);

  const { data: events } = await supabase
    .from("integrity_events")
    .select("type, severity")
    .eq("target_id", attemptId);

  const integrity = integritySummary((events ?? []) as Array<{ type: IntegrityEventType; severity: string }>);

  const coding = input.codingSubmission.trim() && !expired
    ? await evaluateCodeSafely({
        sourceCode: input.codingSubmission,
        problem: attempt.coding_problem as Parameters<typeof evaluateCodeSafely>[0]["problem"],
      })
    : {
        status: "UNAVAILABLE" as const,
        message: expired
          ? "The coding submission arrived after the assessment deadline and was not evaluated."
          : "No coding submission was provided.",
      };

  const finalScore = coding.status === "COMPLETED"
    ? Math.round(mcq.percentage * 0.7 + coding.score * 0.3)
    : mcq.percentage;

  // Load existing user skill and evidence count
  const normalizedSkill = attempt.skill.toLowerCase();

  const { data: existingSkill } = await supabase
    .from("user_skills")
    .select("id, assessment_score, evidence_count")
    .eq("profile_id", profileId)
    .eq("normalized_name", normalizedSkill)
    .maybeSingle();

  const { data: allEvidence } = await supabase
    .from("evidence")
    .select("skills")
    .eq("profile_id", profileId);

  let evidenceCount = existingSkill?.evidence_count ?? 0;
  if (allEvidence) {
    for (const ev of allEvidence) {
      if (Array.isArray(ev.skills) && ev.skills.some((s: string) => s.toLowerCase() === normalizedSkill)) {
        evidenceCount++;
      }
    }
  }

  const verificationStatus = verificationFor({
    score: finalScore,
    integrityRisk: integrity.riskLevel,
    evidenceCount,
  });

  const performanceAnalysis = await analyzeAssessmentPerformance({
    skill: attempt.skill,
    difficulty: attempt.difficulty as Difficulty,
    score: finalScore,
    mcq,
    topics,
    integrityRisk: integrity.riskLevel,
  });

  const receipt = {
    verificationId: `prm_${attempt.id}`,
    userId: profileId,
    skill: attempt.skill,
    assessmentId: attempt.id,
    attemptId: attempt.id,
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

  // Upsert user_skills
  if (existingSkill) {
    await supabase
      .from("user_skills")
      .update({
        assessment_score: Math.max(existingSkill.assessment_score ?? 0, finalScore),
        status: verificationStatus,
        evidence_count: evidenceCount,
        last_assessment_at: new Date().toISOString(),
      })
      .eq("id", existingSkill.id);
  } else {
    await supabase
      .from("user_skills")
      .insert({
        profile_id: profileId,
        name: attempt.skill,
        normalized_name: normalizedSkill,
        status: verificationStatus,
        assessment_score: finalScore,
        evidence_count: evidenceCount,
        last_assessment_at: new Date().toISOString(),
      });
  }

  // Update attempt state to COMPLETED or TIMED_OUT
  const finalState = expired ? "TIMED_OUT" : "COMPLETED";
  const { error: finalUpdateErr } = await supabase
    .from("assessment_attempts")
    .update({
      answers: acceptedAnswers,
      coding_submission: input.codingSubmission.slice(0, 30000),
      mcq_score: mcq.percentage,
      coding_score: coding.status === "COMPLETED" ? coding.score : null,
      coding_evaluation: coding,
      integrity_score: integrity.score,
      final_score: finalScore,
      risk_level: integrity.riskLevel,
      verification_status: verificationStatus,
      topic_performance: topics,
      performance_analysis: performanceAnalysis,
      verification_receipt: receipt,
      state: finalState,
    })
    .eq("id", attemptId);

  if (finalUpdateErr) handleSupabaseError(finalUpdateErr, "Failed to finalize assessment attempt");

  return {
    id: attempt.id,
    skill: attempt.skill,
    state: finalState,
    mcq,
    coding,
    integrity,
    finalScore,
    verificationStatus,
    topicPerformance: topics,
    performanceAnalysis,
    verificationReceipt: receipt,
    completedAt: attempt.submitted_at ?? new Date().toISOString(),
  };
}

export async function getAssessmentResult(profileId: string, attemptId: string) {
  const validProfile = validUuid(profileId, "profile");
  const validAttempt = validUuid(attemptId, "assessment attempt");
  const supabase = getSupabaseAdminClient();

  const { data: attempt, error } = await supabase
    .from("assessment_attempts")
    .select()
    .eq("id", validAttempt)
    .eq("profile_id", validProfile)
    .maybeSingle();

  if (error) handleSupabaseError(error, "Failed to load assessment result");
  if (!attempt) throw new ApiError("Assessment attempt not found.", 404, "NOT_FOUND");
  if (attempt.final_score === null || attempt.final_score === undefined) {
    throw new ApiError("This assessment has not been completed.", 409, "NOT_COMPLETE");
  }

  const { data: events } = await supabase
    .from("integrity_events")
    .select("type, severity")
    .eq("target_id", attempt.id);

  const totalQuestions = Array.isArray(attempt.questions) ? attempt.questions.length : 5;
  const mcqScore = attempt.mcq_score ?? 0;

  return {
    id: attempt.id,
    skill: attempt.skill,
    state: attempt.state,
    mcq: {
      percentage: mcqScore,
      total: totalQuestions,
      correct: Math.round((mcqScore / 100) * totalQuestions),
    },
    coding: attempt.coding_evaluation,
    integrity: integritySummary((events ?? []) as Array<{ type: IntegrityEventType; severity: string }>),
    finalScore: attempt.final_score,
    verificationStatus: attempt.verification_status,
    topicPerformance: attempt.topic_performance,
    performanceAnalysis: attempt.performance_analysis,
    verificationReceipt: attempt.verification_receipt,
    completedAt: attempt.submitted_at ?? null,
  };
}

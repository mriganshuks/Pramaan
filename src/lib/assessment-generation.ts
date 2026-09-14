import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fallbackCodingProblem, questionFingerprint } from "@/lib/assessment-fallback";
import { ApiError } from "@/lib/api";
import { assessmentModel, getOpenAIClient } from "@/lib/openai";
import type { AssessmentQuestion, Difficulty, PerformanceAnalysis } from "@/lib/assessment-types";

const generatedQuestionSchema = z.object({
  questionType: z.enum(["MCQ", "CODE_OUTPUT", "CONCEPTUAL", "SCENARIO"]),
  prompt: z.string().trim().min(12).max(700),
  topic: z.string().trim().min(2).max(80),
  difficulty: z.enum(["beginner", "intermediate", "advanced"]),
  options: z.array(z.string().trim().min(1).max(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(12).max(700),
});
const generatedAssessmentSchema = z.object({ questions: z.array(generatedQuestionSchema).min(1).max(8) });

const analysisSchema = z.object({
  overallUnderstanding: z.string().trim().min(10).max(900),
  strengths: z.array(z.string().trim().min(3).max(180)).min(1).max(6),
  weaknesses: z.array(z.string().trim().min(3).max(180)).min(1).max(6),
  improvementAreas: z.array(z.string().trim().min(3).max(180)).min(1).max(6),
  topicInsights: z.array(z.object({ topic: z.string().trim().min(2).max(80), summary: z.string().trim().min(8).max(240) })).min(1).max(8),
});

export type GeneratedAssessment = { questions: AssessmentQuestion[]; codingProblem: typeof fallbackCodingProblem; generatedBy: "openai"; notice?: string };

function toQuestions(raw: z.infer<typeof generatedQuestionSchema>[]) {
  return raw.map((question) => {
    const ids = ["A", "B", "C", "D"] as const;
    const options = question.options.map((text, index) => ({ id: ids[index], text }));
    return { id: randomUUID(), prompt: question.prompt, topic: question.topic, options, correctOption: ids[question.correctIndex], explanation: question.explanation, fingerprint: questionFingerprint({ prompt: question.prompt, options }) };
  });
}

function validateGeneratedQuestions(input: { skill: string; count: number; questions: AssessmentQuestion[]; previousFingerprints?: string[] }) {
  const fingerprints = new Set<string>();
  const previous = new Set(input.previousFingerprints ?? []);
  const skillTokens = input.skill.toLowerCase().split(/[^a-z0-9+#.]+/).filter(Boolean);

  for (const question of input.questions) {
    if (fingerprints.has(question.fingerprint) || previous.has(question.fingerprint)) throw new Error("Duplicate question fingerprint.");
    fingerprints.add(question.fingerprint);
    if (new Set(question.options.map((option) => option.text.trim().toLowerCase())).size !== question.options.length) throw new Error("Duplicate options.");
    if (!question.options.some((option) => option.id === question.correctOption)) throw new Error("Correct option is invalid.");
    const searchable = `${question.prompt} ${question.topic} ${question.explanation}`.toLowerCase();
    if (skillTokens.length && !skillTokens.some((token) => searchable.includes(token))) throw new Error("Question is not clearly related to the selected skill.");
  }

  if (input.questions.length < input.count) throw new Error("Insufficient validated questions.");
}

function jsonSchema(name: string, schema: Record<string, unknown>) {
  return { type: "json_schema" as const, name, strict: true, schema };
}

export async function generateAssessment(input: { skill: string; difficulty: Difficulty; count: number; previousFingerprints?: string[] }): Promise<GeneratedAssessment> {
  try {
    const response = await getOpenAIClient().responses.create({
      model: assessmentModel(),
      instructions: "You create precise, unambiguous technical skill assessments. Return only data matching the schema. Do not include answer keys in prose.",
      input: `Create ${input.count} distinct ${input.difficulty} questions for the skill "${input.skill}". Mix MCQ, code/output, conceptual, and scenario-style prompts where appropriate, but every item must be answerable using exactly one of four options. Avoid duplicate concepts and avoid these previous fingerprints: ${(input.previousFingerprints ?? []).join(", ") || "none"}. Nonce: ${randomUUID()}.`,
      temperature: 0.4,
      max_output_tokens: 3500,
      store: false,
      text: {
        format: jsonSchema("pramaan_assessment", {
          type: "object",
          additionalProperties: false,
          required: ["questions"],
          properties: {
            questions: {
              type: "array",
              minItems: input.count,
              maxItems: input.count,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["questionType", "prompt", "topic", "difficulty", "options", "correctIndex", "explanation"],
                properties: {
                  questionType: { type: "string", enum: ["MCQ", "CODE_OUTPUT", "CONCEPTUAL", "SCENARIO"] },
                  prompt: { type: "string", minLength: 12, maxLength: 700 },
                  topic: { type: "string", minLength: 2, maxLength: 80 },
                  difficulty: { type: "string", enum: ["beginner", "intermediate", "advanced"] },
                  options: { type: "array", minItems: 4, maxItems: 4, items: { type: "string", minLength: 1, maxLength: 300 } },
                  correctIndex: { type: "integer", minimum: 0, maximum: 3 },
                  explanation: { type: "string", minLength: 12, maxLength: 700 },
                },
              },
            },
          },
        }),
      },
    });
    if (response.error) throw new Error(response.error.message);
    const parsed = generatedAssessmentSchema.parse(JSON.parse(response.output_text || "{}"));
    const questions = toQuestions(parsed.questions).filter((question) => !(input.previousFingerprints ?? []).includes(question.fingerprint));
    validateGeneratedQuestions({ skill: input.skill, count: input.count, questions, previousFingerprints: input.previousFingerprints });
    return { questions: questions.slice(0, input.count), codingProblem: fallbackCodingProblem, generatedBy: "openai" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    console.error("OpenAI assessment generation failed", error);
    throw new ApiError("Assessment generation is temporarily unavailable. Please try again shortly.", 503, "ASSESSMENT_GENERATION_FAILED");
  }
}

export async function analyzeAssessmentPerformance(input: {
  skill: string;
  difficulty: Difficulty;
  score: number;
  mcq: { correct: number; total: number; percentage: number };
  topics: Array<{ topic: string; total: number; correct: number }>;
  integrityRisk: string;
}): Promise<PerformanceAnalysis | null> {
  try {
    const response = await getOpenAIClient().responses.create({
      model: assessmentModel(),
      instructions: "Analyze technical assessment performance. Do not decide verification status. Keep feedback specific and actionable.",
      input: JSON.stringify(input),
      temperature: 0.2,
      max_output_tokens: 1800,
      store: false,
      text: {
        format: jsonSchema("pramaan_performance_analysis", {
          type: "object",
          additionalProperties: false,
          required: ["overallUnderstanding", "strengths", "weaknesses", "improvementAreas", "topicInsights"],
          properties: {
            overallUnderstanding: { type: "string", minLength: 10, maxLength: 900 },
            strengths: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 3, maxLength: 180 } },
            weaknesses: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 3, maxLength: 180 } },
            improvementAreas: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", minLength: 3, maxLength: 180 } },
            topicInsights: {
              type: "array",
              minItems: 1,
              maxItems: 8,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["topic", "summary"],
                properties: {
                  topic: { type: "string", minLength: 2, maxLength: 80 },
                  summary: { type: "string", minLength: 8, maxLength: 240 },
                },
              },
            },
          },
        }),
      },
    });
    if (response.error) throw new Error(response.error.message);
    return analysisSchema.parse(JSON.parse(response.output_text || "{}"));
  } catch (error) {
    console.error("OpenAI performance analysis failed", error);
    return null;
  }
}

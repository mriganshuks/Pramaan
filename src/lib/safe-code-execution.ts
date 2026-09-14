import { z } from "zod";
import type { CodingProblem } from "@/lib/assessment-types";

const evaluatorResponseSchema = z.object({
  passed: z.number().int().min(0),
  total: z.number().int().positive(),
  results: z.array(z.object({ passed: z.boolean(), message: z.string().max(500).optional() })).max(50),
});

export type CodeEvaluation =
  | { status: "COMPLETED"; score: number; passed: number; total: number; results: Array<{ passed: boolean; message?: string }> }
  | { status: "UNAVAILABLE"; message: string };

/**
 * Sends code only to a separately deployed, sandboxed evaluator. This app never
 * starts a process, shell, container, or VM for untrusted candidate code.
 */
export async function evaluateCodeSafely(input: { sourceCode: string; problem: CodingProblem }): Promise<CodeEvaluation> {
  const endpoint = process.env.CODE_EXECUTION_API_URL?.trim();
  if (!endpoint) return { status: "UNAVAILABLE", message: "A secure code-execution service has not been configured." };
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.CODE_EXECUTION_API_KEY ? { Authorization: `Bearer ${process.env.CODE_EXECUTION_API_KEY}` } : {}),
      },
      body: JSON.stringify({ language: input.problem.language, sourceCode: input.sourceCode, entryPoint: "firstRepeated", tests: input.problem.hiddenTests }),
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`The evaluator returned ${response.status}.`);
    const result = evaluatorResponseSchema.parse(await response.json());
    return { status: "COMPLETED", score: Math.round((result.passed / result.total) * 100), passed: result.passed, total: result.total, results: result.results };
  } catch (error) {
    console.error("Code evaluation failed", error);
    return { status: "UNAVAILABLE", message: "The secure code-execution service was unavailable. Your code was stored but was not executed." };
  }
}

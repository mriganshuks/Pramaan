import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { submitAssessmentAttempt } from "@/lib/assessment-service";

const schema = z.object({ assessmentId: z.string().min(1), answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])), codingSubmission: z.string().max(30000).default(""), timeout: z.boolean().default(false) });
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const input = schema.parse(await readJson(request));
    return Response.json({ result: await submitAssessmentAttempt({ profileId: await requireCurrentProfileId(), attemptId: input.assessmentId, answers: input.answers, codingSubmission: input.codingSubmission, timeout: input.timeout }) });
  } catch (error) { return errorResponse(error); }
}

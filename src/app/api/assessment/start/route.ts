import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createAssessmentAttempt } from "@/lib/assessment-service";

const schema = z.object({ skill: z.string().trim().min(2).max(80), difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"), consent: z.literal(true) });
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const input = schema.parse(await readJson(request));
    const profileId = await requireCurrentProfileId(request);
    const attempt = await createAssessmentAttempt({
      profileId,
      skill: input.skill,
      difficulty: input.difficulty,
    });
    const session = {
      id: attempt.id,
      sessionId: attempt.id,
      startTime: attempt.startedAt,
      startedAt: attempt.startedAt,
      endTime: attempt.expiresAt,
      expiresAt: attempt.expiresAt,
      duration: 1800,
      state: attempt.state,
      skill: attempt.skill,
      difficulty: attempt.difficulty,
    };
    return Response.json({ attempt, session }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

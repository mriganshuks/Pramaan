import { connectToDatabase } from "@/lib/mongodb";
import { ApiError, errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getAssessmentAttempt } from "@/lib/assessment-service";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("An assessment ID is required.", 400, "ASSESSMENT_ID_REQUIRED");
    const profileId = await requireCurrentProfileId(request);
    const attempt = await getAssessmentAttempt(profileId, id);
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
    return Response.json({ attempt, session });
  } catch (error) {
    return errorResponse(error);
  }
}

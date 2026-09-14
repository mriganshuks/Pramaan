import { connectToDatabase } from "@/lib/mongodb";
import { ApiError, errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getAssessmentAttempt } from "@/lib/assessment-service";

export async function GET(request: Request) {
  try {
    await connectToDatabase();
    const id = new URL(request.url).searchParams.get("id");
    if (!id) throw new ApiError("An assessment ID is required.", 400, "ASSESSMENT_ID_REQUIRED");
    return Response.json({ attempt: await getAssessmentAttempt(await requireCurrentProfileId(), id) });
  } catch (error) { return errorResponse(error); }
}

import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getAssessmentResult } from "@/lib/assessment-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ result: await getAssessmentResult(await requireCurrentProfileId(), id) }); } catch (error) { return errorResponse(error); }
}

import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getAssessmentResult } from "@/lib/assessment-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ result: await getAssessmentResult(await requireCurrentProfileId(request), id) }); } catch (error) { return errorResponse(error); }
}

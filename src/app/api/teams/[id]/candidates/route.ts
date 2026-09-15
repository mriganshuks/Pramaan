import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { discoverCandidates } from "@/lib/team-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ candidates: await discoverCandidates(id, await requireCurrentProfileId(request)) }); } catch (error) { return errorResponse(error); }
}

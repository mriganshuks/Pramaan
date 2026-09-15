import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getSkillChallenge } from "@/lib/team-service";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ challenge: await getSkillChallenge(id, await requireCurrentProfileId(request)) }); } catch (error) { return errorResponse(error); }
}

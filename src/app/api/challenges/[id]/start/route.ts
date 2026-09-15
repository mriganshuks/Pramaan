import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { startSkillChallenge } from "@/lib/team-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ challenge: await startSkillChallenge(id, await requireCurrentProfileId(request)) }); } catch (error) { return errorResponse(error); }
}

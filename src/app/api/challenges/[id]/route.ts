import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getSkillChallenge } from "@/lib/team-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ challenge: await getSkillChallenge(id, await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}

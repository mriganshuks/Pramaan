import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { startSkillChallenge } from "@/lib/team-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ challenge: await startSkillChallenge(id, await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}

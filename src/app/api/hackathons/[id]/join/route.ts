import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { joinHackathon, leaveHackathon } from "@/lib/team-service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ hackathon: await joinHackathon(await requireCurrentProfileId(), id) }); } catch (error) { return errorResponse(error); }
}
export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ hackathon: await leaveHackathon(await requireCurrentProfileId(), id) }); } catch (error) { return errorResponse(error); }
}

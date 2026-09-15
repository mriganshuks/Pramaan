import { errorResponse } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { joinHackathon, leaveHackathon } from "@/lib/team-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ hackathon: await joinHackathon(await requireCurrentProfileId(request), id) }); } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return Response.json({ hackathon: await leaveHackathon(await requireCurrentProfileId(request), id) }); } catch (error) { return errorResponse(error); }
}

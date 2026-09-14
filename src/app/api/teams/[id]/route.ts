import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { getTeam } from "@/lib/team-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ team: await getTeam(id) }); } catch (error) { return errorResponse(error); }
}

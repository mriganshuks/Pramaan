import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createTeam, listMyTeams, teamSchema } from "@/lib/team-service";

export async function GET() {
  try { await connectToDatabase(); return Response.json({ teams: await listMyTeams(await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { await connectToDatabase(); return Response.json({ team: await createTeam(await requireCurrentProfileId(), teamSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

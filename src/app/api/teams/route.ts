import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createTeam, listMyTeams, teamSchema } from "@/lib/team-service";

export async function GET(request: Request) {
  try {
    const profileId = await requireCurrentProfileId(request);
    return Response.json({ teams: await listMyTeams(profileId) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    const profileId = await requireCurrentProfileId(request);
    const body = await readJson(request);
    return Response.json({ team: await createTeam(profileId, teamSchema.parse(body)) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

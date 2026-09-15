import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createHackathon, hackathonSchema, listHackathons } from "@/lib/team-service";

export async function GET(request: Request) {
  try { return Response.json({ hackathons: await listHackathons(await requireCurrentProfileId(request)) }); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { return Response.json({ hackathon: await createHackathon(await requireCurrentProfileId(request), hackathonSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

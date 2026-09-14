import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createHackathon, hackathonSchema, listHackathons } from "@/lib/team-service";

export async function GET() {
  try { await connectToDatabase(); return Response.json({ hackathons: await listHackathons(await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try { await connectToDatabase(); return Response.json({ hackathon: await createHackathon(await requireCurrentProfileId(), hackathonSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

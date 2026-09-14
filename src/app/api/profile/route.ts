import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getOwnProfile, profilePatchSchema, updateOwnProfile } from "@/lib/profile-service";

export async function GET() {
  try { await connectToDatabase(); return Response.json({ profile: await getOwnProfile(await requireCurrentProfileId()) }); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: Request) {
  try { await connectToDatabase(); return Response.json({ profile: await updateOwnProfile(await requireCurrentProfileId(), profilePatchSchema.parse(await readJson(request))) }); } catch (error) { return errorResponse(error); }
}

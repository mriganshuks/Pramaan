import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { getOwnProfile, profilePatchSchema, updateOwnProfile } from "@/lib/profile-service";

export async function GET(request: Request) {
  try {
    const profileId = await requireCurrentProfileId(request);
    return Response.json({ profile: await getOwnProfile(profileId) });
  } catch (error) {
    return errorResponse(error);
  }
}
export async function PATCH(request: Request) {
  try {
    const profileId = await requireCurrentProfileId(request);
    const body = await readJson(request);
    return Response.json({ profile: await updateOwnProfile(profileId, profilePatchSchema.parse(body)) });
  } catch (error) {
    return errorResponse(error);
  }
}

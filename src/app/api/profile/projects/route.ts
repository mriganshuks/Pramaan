import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { addProject, projectSchema } from "@/lib/profile-service";

export async function POST(request: Request) {
  try { return Response.json({ profile: await addProject(await requireCurrentProfileId(request), projectSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

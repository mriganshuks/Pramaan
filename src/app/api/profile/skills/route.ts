import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { addSkill, removeSkill, skillSchema } from "@/lib/profile-service";

export async function POST(request: Request) {
  try { const { name } = skillSchema.parse(await readJson(request)); return Response.json({ profile: await addSkill(await requireCurrentProfileId(request), name) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}
export async function DELETE(request: Request) {
  try { const name = new URL(request.url).searchParams.get("name"); const parsed = skillSchema.parse({ name }); return Response.json({ profile: await removeSkill(await requireCurrentProfileId(request), parsed.name) }); } catch (error) { return errorResponse(error); }
}

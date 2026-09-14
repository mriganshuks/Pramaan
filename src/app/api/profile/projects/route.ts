import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { addProject, projectSchema } from "@/lib/profile-service";

export async function POST(request: Request) {
  try { await connectToDatabase(); return Response.json({ profile: await addProject(await requireCurrentProfileId(), projectSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

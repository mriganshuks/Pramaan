import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { addEvidence, evidenceSchema } from "@/lib/profile-service";

export async function POST(request: Request) {
  try { return Response.json({ profile: await addEvidence(await requireCurrentProfileId(request), evidenceSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

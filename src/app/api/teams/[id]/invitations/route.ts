import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { invitationSchema, sendInvitation } from "@/lib/team-service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ invitation: await sendInvitation(id, await requireCurrentProfileId(), invitationSchema.parse(await readJson(request))) }, { status: 201 }); } catch (error) { return errorResponse(error); }
}

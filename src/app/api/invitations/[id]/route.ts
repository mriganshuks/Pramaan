import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { respondToInvitation } from "@/lib/team-service";

const schema = z.object({ action: z.enum(["ACCEPT", "REJECT"]) });
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; const { action } = schema.parse(await readJson(request)); return Response.json({ invitation: await respondToInvitation(id, await requireCurrentProfileId(), action) }); } catch (error) { return errorResponse(error); }
}

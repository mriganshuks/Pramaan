import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse } from "@/lib/api";
import { publicProfile } from "@/lib/profile-service";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try { await connectToDatabase(); const { id } = await context.params; return Response.json({ profile: await publicProfile(id) }); } catch (error) { return errorResponse(error); }
}

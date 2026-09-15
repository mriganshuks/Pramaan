import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { integrityEventsSchema } from "@/lib/assessment-integrity";
import { recordChallengeIntegrity } from "@/lib/team-service";

const schema = z.object({ events: integrityEventsSchema });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const { events } = schema.parse(await readJson(request)); return Response.json({ integrity: await recordChallengeIntegrity({ challengeId: id, profileId: await requireCurrentProfileId(request), events }) }); } catch (error) { return errorResponse(error); }
}

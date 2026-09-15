import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { integrityEventsSchema } from "@/lib/assessment-integrity";
import { recordAssessmentIntegrity } from "@/lib/assessment-service";

const schema = z.object({ assessmentId: z.string().min(1), events: integrityEventsSchema });
export async function POST(request: Request) {
  try {
    const input = schema.parse(await readJson(request));
    return Response.json({ integrity: await recordAssessmentIntegrity({ profileId: await requireCurrentProfileId(request), attemptId: input.assessmentId, events: input.events }) });
  } catch (error) { return errorResponse(error); }
}

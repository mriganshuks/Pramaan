import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import {
  challengeSchema,
  createSkillChallenge,
  listTeamChallenges,
  decideSkillChallenge,
} from "@/lib/team-service";

const decisionSchema = z.object({
  challengeId: z.string().trim().min(1),
  decision: z.enum(["ACCEPT", "REJECT"]),
});

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId(request);
    return Response.json({ challenges: await listTeamChallenges(id, profileId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId(request);
    const body = await readJson(request);
    return Response.json(
      { challenge: await createSkillChallenge(id, profileId, challengeSchema.parse(body)) },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId(request);
    const { challengeId, decision } = decisionSchema.parse(await readJson(request));
    return Response.json(await decideSkillChallenge(id, profileId, challengeId, decision));
  } catch (error) {
    return errorResponse(error);
  }
}

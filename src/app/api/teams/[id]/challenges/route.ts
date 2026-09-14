import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
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

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId();
    return Response.json({ challenges: await listTeamChallenges(id, profileId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await connectToDatabase();
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId();
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
    await connectToDatabase();
    const { id } = await context.params;
    const profileId = await requireCurrentProfileId();
    const { challengeId, decision } = decisionSchema.parse(await readJson(request));
    return Response.json(await decideSkillChallenge(id, profileId, challengeId, decision));
  } catch (error) {
    return errorResponse(error);
  }
}

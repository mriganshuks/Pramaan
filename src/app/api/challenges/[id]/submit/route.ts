import { z } from "zod";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { submitSkillChallenge } from "@/lib/team-service";

const schema = z.object({ answers: z.record(z.string(), z.enum(["A", "B", "C", "D"])), timeout: z.boolean().default(false) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; const input = schema.parse(await readJson(request)); return Response.json({ result: await submitSkillChallenge({ challengeId: id, candidateId: await requireCurrentProfileId(request), ...input }) }); } catch (error) { return errorResponse(error); }
}

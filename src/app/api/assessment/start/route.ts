import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb";
import { errorResponse, readJson } from "@/lib/api";
import { requireCurrentProfileId } from "@/lib/profile-context";
import { createAssessmentAttempt } from "@/lib/assessment-service";

const schema = z.object({ skill: z.string().trim().min(2).max(80), difficulty: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"), consent: z.literal(true) });
export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const input = schema.parse(await readJson(request));
    return Response.json({ attempt: await createAssessmentAttempt({ profileId: await requireCurrentProfileId(), skill: input.skill, difficulty: input.difficulty }) }, { status: 201 });
  } catch (error) { return errorResponse(error); }
}

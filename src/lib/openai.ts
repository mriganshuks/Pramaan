import OpenAI from "openai";
import { ApiError } from "@/lib/api";

let client: OpenAI | null = null;

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new ApiError(
      "OpenAI is not configured. Add OPENAI_API_KEY on the server to generate assessments.",
      503,
      "OPENAI_NOT_CONFIGURED"
    );
  }

  client ??= new OpenAI({ apiKey });
  return client;
}

export function assessmentModel() {
  const model = process.env.OPENAI_ASSESSMENT_MODEL?.trim();
  if (!model || model === "gpt-5.1-mini" || model.includes("gpt-5")) {
    return "gpt-4o-mini";
  }
  return model;
}

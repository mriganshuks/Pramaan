import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(message: string, public readonly status = 400, public readonly code = "INVALID_REQUEST") {
    super(message);
  }
}

export function errorResponse(error: unknown) {
  if (error instanceof ApiError) return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status });
  if (error instanceof ZodError) {
    return Response.json({ error: { code: "VALIDATION_ERROR", message: "Please check the submitted details.", fields: error.flatten().fieldErrors } }, { status: 400 });
  }
  console.error("Unhandled API error", error);
  return Response.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } }, { status: 500 });
}

export async function readJson(request: Request): Promise<unknown> {
  try { return await request.json(); } catch { throw new ApiError("The request body must be valid JSON.", 400, "INVALID_JSON"); }
}

export function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

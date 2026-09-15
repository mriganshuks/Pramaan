import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new ApiError(
      "Supabase configuration is missing. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.",
      500,
      "SUPABASE_CONFIG_MISSING"
    );
  }

  if (!adminClient) {
    adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(id: string): boolean {
  return typeof id === "string" && UUID_REGEX.test(id);
}

export function requireValidUuid(id: string, entity = "record"): string {
  if (!isValidUuid(id)) {
    throw new ApiError(`Invalid ${entity} ID format.`, 400, "INVALID_ID");
  }
  return id;
}

export function handleSupabaseError(error: { code?: string; message: string; details?: string | null }, defaultMessage = "Database operation failed"): never {
  // PostgreSQL error code 23505 = unique_violation
  if (error.code === "23505") {
    throw new ApiError(
      "A record with those unique values already exists.",
      409,
      "CONFLICT"
    );
  }
  // PostgreSQL error code 23503 = foreign_key_violation
  if (error.code === "23503") {
    throw new ApiError(
      "The referenced record was not found.",
      404,
      "FOREIGN_KEY_NOT_FOUND"
    );
  }
  // PostgreSQL error code 22P02 = invalid_text_representation (invalid UUID, etc.)
  if (error.code === "22P02") {
    throw new ApiError(
      "Invalid data representation or ID format.",
      400,
      "INVALID_INPUT"
    );
  }
  throw new ApiError(
    `${defaultMessage}: ${error.message || "Unknown database error"}`,
    500,
    "DATABASE_ERROR"
  );
}

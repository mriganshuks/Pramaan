import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";
import { connectToDatabase } from "@/lib/mongodb";
import { findOrCreateUserForSupabaseAuth } from "@/lib/profile-service";

export const PROFILE_COOKIE = "pramaan_profile_id";

function authSecret() {
  const secret = process.env.AUTH_SECRET?.trim() || "pramaan-dev-fallback-secret-for-browser-cookies-only";
  return secret;
}

function signature(profileId: string) {
  return createHmac("sha256", authSecret()).update(profileId).digest("base64url");
}

export function signedProfileCookie(profileId: string) {
  return `${profileId}.${signature(profileId)}`;
}

function verifySignedProfileCookie(value: string) {
  const separator = value.lastIndexOf(".");
  if (separator <= 0) return null;
  const profileId = value.slice(0, separator);
  const signed = value.slice(separator + 1);
  const expected = signature(profileId);
  const signedBuffer = Buffer.from(signed);
  const expectedBuffer = Buffer.from(expected);
  if (signedBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(signedBuffer, expectedBuffer) ? profileId : null;
}

export async function getCurrentProfileId(request?: Request): Promise<string | null> {
  // 1. Try to authenticate via Supabase session (Bearer token or Supabase session cookies)
  try {
    const supabaseUser = await getSupabaseUserFromRequest(request);
    if (supabaseUser) {
      await connectToDatabase();
      const profile = await findOrCreateUserForSupabaseAuth({
        supabaseId: supabaseUser.id,
        email: supabaseUser.email ?? "",
        displayName:
          supabaseUser.user_metadata?.full_name ??
          supabaseUser.user_metadata?.name ??
          supabaseUser.email?.split("@")[0] ??
          "Candidate",
        avatarUrl:
          supabaseUser.user_metadata?.avatar_url ??
          supabaseUser.user_metadata?.picture,
      });
      if (profile?.id) {
        return profile.id;
      }
    }
  } catch (error) {
    console.error("Failed to authenticate Supabase user in profile context:", error);
  }

  // 2. Fall back to signed local profile cookie
  try {
    const value = (await cookies()).get(PROFILE_COOKIE)?.value;
    if (value) {
      const verified = verifySignedProfileCookie(value);
      if (verified) return verified;
    }
  } catch {
    // Cookie store may fail in non-request contexts
  }

  return null;
}

export async function requireCurrentProfileId(request?: Request): Promise<string> {
  const profileId = await getCurrentProfileId(request);
  if (!profileId) {
    throw new ApiError(
      "Authentication required. Please sign in with Google or initialize your profile.",
      401,
      "UNAUTHORIZED"
    );
  }
  return profileId;
}

export function profileCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  };
}


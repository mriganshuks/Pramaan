import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

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

export async function getCurrentProfileId() {
  const value = (await cookies()).get(PROFILE_COOKIE)?.value;
  if (!value) return null;
  return verifySignedProfileCookie(value);
}

export async function requireCurrentProfileId() {
  const profileId = await getCurrentProfileId();
  if (!profileId) throw new ApiError("Create a local profile before continuing.", 401, "PROFILE_REQUIRED");
  return profileId;
}

export function profileCookieOptions() {
  return { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 };
}

import { NextResponse } from "next/server";
import { createProfile, createProfileSchema } from "@/lib/profile-service";
import { ApiError, errorResponse, readJson } from "@/lib/api";
import { PROFILE_COOKIE, profileCookieOptions, signedProfileCookie } from "@/lib/profile-context";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabaseUser = await getSupabaseUserFromRequest(request);

    if (!supabaseUser) {
      throw new ApiError(
        "Authentication required. You must authenticate with Supabase before creating a Pramaan profile.",
        401,
        "UNAUTHORIZED"
      );
    }

    const body = await readJson(request);
    const parsed = createProfileSchema.parse(body);

    const email = (supabaseUser.email || parsed.email).trim().toLowerCase();

    const profile = await createProfile({
      ...parsed,
      email,
      supabaseId: supabaseUser.id,
    });

    const response = NextResponse.json({ profile }, { status: 201 });
    response.cookies.set(
      PROFILE_COOKIE,
      signedProfileCookie(profile.id),
      profileCookieOptions()
    );
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

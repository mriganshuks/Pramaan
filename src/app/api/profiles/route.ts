import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { createProfile, createProfileSchema } from "@/lib/profile-service";
import { errorResponse, readJson } from "@/lib/api";
import { PROFILE_COOKIE, profileCookieOptions, signedProfileCookie } from "@/lib/profile-context";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const profile = await createProfile(createProfileSchema.parse(await readJson(request)));
    const response = NextResponse.json({ profile }, { status: 201 });
    response.cookies.set(PROFILE_COOKIE, signedProfileCookie(profile.id), profileCookieOptions());
    return response;
  } catch (error) { return errorResponse(error); }
}

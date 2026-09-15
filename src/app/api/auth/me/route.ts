import { errorResponse } from "@/lib/api";
import { getSupabaseUserFromRequest } from "@/lib/supabase/server";
import { findUserForSupabaseAuth, getOwnProfile } from "@/lib/profile-service";
import { getCurrentProfileId } from "@/lib/profile-context";

export async function GET(request: Request) {
  try {
    const supabaseUser = await getSupabaseUserFromRequest(request);

    if (supabaseUser) {
      const profile = await findUserForSupabaseAuth(
        supabaseUser.id,
        supabaseUser.email ?? ""
      );

      if (profile) {
        return Response.json({
          authenticated: true,
          hasProfile: true,
          profile,
          user: {
            id: profile.id,
            email: profile.email,
            name: profile.displayName,
            supabaseId: supabaseUser.id,
          },
        });
      }

      return Response.json({
        authenticated: true,
        hasProfile: false,
        profile: null,
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email ?? "",
          name:
            supabaseUser.user_metadata?.full_name ??
            supabaseUser.user_metadata?.name ??
            "",
          supabaseId: supabaseUser.id,
        },
      });
    }

    // Fall back to signed local profile cookie if session cookie exists
    const profileId = await getCurrentProfileId(request);
    if (profileId) {
      const profile = await getOwnProfile(profileId);
      return Response.json({
        authenticated: true,
        hasProfile: true,
        profile,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.displayName,
        },
      });
    }

    return Response.json({
      authenticated: false,
      hasProfile: false,
      profile: null,
      user: null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

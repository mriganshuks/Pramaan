import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { connectToDatabase } from "@/lib/mongodb";
import { findOrCreateUserForSupabaseAuth } from "@/lib/profile-service";
import { PROFILE_COOKIE, profileCookieOptions, signedProfileCookie } from "@/lib/profile-context";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.user) {
        try {
          await connectToDatabase();
          const profile = await findOrCreateUserForSupabaseAuth({
            supabaseId: data.user.id,
            email: data.user.email ?? "",
            displayName: data.user.user_metadata?.full_name ?? data.user.user_metadata?.name ?? data.user.email?.split("@")[0] ?? "Candidate",
            avatarUrl: data.user.user_metadata?.avatar_url ?? data.user.user_metadata?.picture,
          });

          const response = NextResponse.redirect(`${origin}${next}`);
          if (profile?.id) {
            response.cookies.set(
              PROFILE_COOKIE,
              signedProfileCookie(profile.id),
              profileCookieOptions()
            );
          }
          return response;
        } catch (dbError) {
          console.error("Error linking Supabase user to MongoDB profile:", dbError);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

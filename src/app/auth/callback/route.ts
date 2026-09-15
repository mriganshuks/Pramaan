import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { findUserForSupabaseAuth } from "@/lib/profile-service";
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
          const profile = await findUserForSupabaseAuth(
            data.user.id,
            data.user.email ?? ""
          );

          if (profile?.id) {
            const response = NextResponse.redirect(`${origin}${next}`);
            response.cookies.set(
              PROFILE_COOKIE,
              signedProfileCookie(profile.id),
              profileCookieOptions()
            );
            return response;
          } else {
            // New user without a Pramaan profile yet: direct to onboarding
            return NextResponse.redirect(`${origin}/onboarding`);
          }
        } catch (dbError) {
          console.error("Error checking profile in Supabase callback:", dbError);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}

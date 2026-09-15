import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/profile-context";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear profile cookie across root path
  response.cookies.set(PROFILE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  });

  // Sign out from Supabase if active
  try {
    const supabase = await getSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch {
    // Ignore if session already terminated
  }

  return response;
}

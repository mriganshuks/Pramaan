import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { PROFILE_COOKIE } from "@/lib/profile-context";

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear local profile cookie
  response.cookies.delete(PROFILE_COOKIE);

  // Sign out from Supabase if active
  const supabase = await getSupabaseServerClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  return response;
}

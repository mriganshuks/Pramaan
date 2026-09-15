import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return Response.json(
        {
          success: false,
          database: "supabase-postgresql",
          message: "Supabase PostgreSQL query failed",
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      database: "supabase-postgresql",
      message: "Supabase PostgreSQL connected successfully",
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        database: "supabase-postgresql",
        message: "Database health check error",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

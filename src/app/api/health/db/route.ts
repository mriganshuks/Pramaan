import { connectToDatabase, isDatabaseConnected } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectToDatabase();
    const connected = isDatabaseConnected();

    return Response.json({
      success: true,
      mode: connected ? "mongodb" : "in-memory",
      message: connected
        ? "MongoDB connected successfully"
        : "Running with in-memory database mock (MONGODB_URI not configured)",
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Database health check error",
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

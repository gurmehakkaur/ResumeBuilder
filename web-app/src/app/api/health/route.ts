/**
 * GET /api/health
 * Health check endpoint for the extension
 */
export async function GET() {
  return Response.json(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "LazyMe Extension API",
      version: "2.0.0",
    },
    { status: 200 }
  );
}

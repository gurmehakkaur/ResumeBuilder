import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * GET /api/extension/resume/status
 * Get master resume status and metadata for extension
 */
export async function GET(req: Request) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return Response.json(
        { error: "No valid authorization header provided" },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get user information by calling our own extension user endpoint
    // This endpoint already works and handles Auth0 session validation properly
    const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";
    const userApiUrl = `${baseUrl}/api/extension/user`;

    const userResponse = await fetch(userApiUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!userResponse.ok) {

      return Response.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    const userData = await userResponse.json();

    if (!userData.email) {
      return Response.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    const email = userData.email;

    await connectMongoDB();

    // Get the current user from MongoDB
    const user = await User.findOne({ email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has a master resume
    if (!user.masterResume) {
      return Response.json({
        hasResume: false,
        message: "No master resume found",
      });
    }

    // Return resume data - assume everything is text format

    const resumeData = {
      hasResume: true,
      fileName: `Master_Resume_${user.name || user.email.split("@")[0]}.txt`,
      size: user.masterResume.length,
      lastUpdated: user.updatedAt,
      format: "TXT", // Assume text format for all files
      fileType: "text/plain",
    };

    return Response.json(resumeData);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch resume status";
    console.error("Extension API: Get resume status error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

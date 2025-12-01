import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * GET /api/extension/user
 * Get user information for extension
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

    // For extension requests, we'll use a simple approach:
    // Make a request to our own /api/users endpoint with the session token as a cookie
    // This endpoint already works and uses Auth0's session handling
    const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";
    const usersApiUrl = `${baseUrl}/api/users`;

    // Make a request to our main users API endpoint
    const userResponse = await fetch(usersApiUrl, {
      method: "GET",
      headers: {
        Cookie: `__session=${sessionToken}`,
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

    // Extract user information from the response
    if (!userData.user || !userData.user.email) {
      return Response.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    const email = userData.user.email;

    await connectMongoDB();

    // Get the current user from MongoDB
    const user = await User.findOne({ email });

    if (!user) {

      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Return user information for extension
    const extensionUserData = {
      id: user._id,
      name: user.name,
      email: user.email,
      jobTitle: user.jobTitle,
      hasMasterResume: !!user.masterResume,
      createdAt: user.createdAt,
    };

    return Response.json(extensionUserData, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user data";
    console.error("Extension API: Get user error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import { Buffer } from "buffer";

/**
 * GET /api/extension/resume/download
 * Download master resume for extension
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
      return Response.json(
        { error: "No master resume found" },
        { status: 404 }
      );
    }

    // Debug: Check what we're getting from MongoDB

    // Generate filename and assume text format (since we're treating everything as string)
    const fileName = `Master_Resume_${
      user.name || user.email.split("@")[0]
    }.txt`;
    const fileType = "text/plain";

    // Handle data conversion - detect if it's text or base64
    let binaryData;

    if (typeof user.masterResume === "string") {
      // Check if this looks like base64 or plain text
      const isBase64 =
        /^[A-Za-z0-9+/]*={0,2}$/.test(user.masterResume) &&
        user.masterResume.length % 4 === 0 &&
        user.masterResume.length > 20;

      const isTextContent =
        user.masterResume.startsWith("{") ||
        user.masterResume.startsWith("[") ||
        user.masterResume.includes("client_id");

      if (isTextContent || !isBase64) {
        // This is plain text content (like JSON), treat as UTF-8
        binaryData = Buffer.from(user.masterResume, "utf8");
      } else {
        // This is base64 encoded binary data
        try {
          binaryData = Buffer.from(user.masterResume, "base64");
        } catch {
          binaryData = Buffer.from(user.masterResume, "utf8");
        }
      }
    } else {
      // Fallback: convert to string and then to buffer
      const stringData = String(user.masterResume);
      binaryData = Buffer.from(stringData, "utf8");
    }

    // Return the resume as a downloadable file in its original format
    return new Response(binaryData, {
      headers: {
        "Content-Type": fileType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": binaryData.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to download resume";
    console.error("Extension API: Download resume error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * HEAD /api/extension/resume/download
 * Check master resume existence and metadata for extension
 */
export async function HEAD(req: Request) {
  try {
    // Get the Authorization header
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(null, { status: 401 });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get user information by calling our own extension user endpoint
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
      return new Response(null, { status: 401 });
    }

    const userData = await userResponse.json();

    if (!userData.email) {
      return new Response(null, { status: 400 });
    }

    const email = userData.email;

    await connectMongoDB();

    // Get the current user from MongoDB
    const user = await User.findOne({ email });

    if (!user || !user.masterResume) {
      return new Response(null, { status: 404 });
    }

    // Debug: Check what we're getting from MongoDB in HEAD request

    // Generate filename and assume text format
    const fileName = `Master_Resume_${
      user.name || user.email.split("@")[0]
    }.txt`;
    const fileType = "text/plain";

    // Calculate file size based on string data
    let fileSize;
    if (typeof user.masterResume === "string") {
      fileSize = user.masterResume.length;
    } else {
      fileSize = String(user.masterResume).length;
    }

    // Return headers only (no body)
    return new Response(null, {
      status: 200,
      headers: {
        "Content-Type": fileType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileSize.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    console.error("Extension API: HEAD resume error:", error);
    return new Response(null, { status: 500 });
  }
}

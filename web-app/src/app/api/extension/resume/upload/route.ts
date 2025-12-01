import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";

/**
 * POST /api/extension/resume/upload
 * Upload master resume for extension
 */
export async function POST(req: Request) {
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

    // Parse the form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    // Debug: Check if file is actually a File object and has content
    if (!(file instanceof File)) {
      console.error(
        "Upload API: Received object is not a File instance:",
        typeof file
      );
      return Response.json({ error: "Invalid file object" }, { status: 400 });
    }

    // Check if file content is text or binary
    const fileText = await file.text();

    // Check if the file content is actually "[object Object]"
    if (fileText.includes("[object Object]")) {
      console.error(
        "Upload API: WARNING - File contains '[object Object]' text!"
      );
      console.error(
        "Upload API: This suggests the file itself is corrupted or contains object data."
      );
      return Response.json(
        {
          error:
            "The uploaded file appears to be corrupted and contains '[object Object]' text. Please select a valid file.",
        },
        { status: 400 }
      );
    }

    // Determine if this is text content or binary content
    const isTextContent =
      file.type === "text/plain" ||
      fileText.startsWith("{") ||
      fileText.startsWith("[") ||
      /^[a-zA-Z0-9\s{}[\]":,.-]+$/.test(fileText.substring(0, 100));

    let dataToStore;

    if (isTextContent) {
      // For text content (like JSON), store as plain text
      dataToStore = fileText;

    } else {
      // For binary content (like PDF), convert to base64
      const arrayBuffer = await file.arrayBuffer();
      dataToStore = Buffer.from(arrayBuffer).toString("base64");

    }

    // Update user's master resume (store as string only)
    user.masterResume = dataToStore;
    await user.save();

    // Return success response with file info
    const response = {
      message: "Resume uploaded successfully",
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date().toISOString(),
    };

    return Response.json(response, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload resume";
    console.error("Extension API: Upload resume error:", error);
    return Response.json({ error: message }, { status: 500 });
  }
}

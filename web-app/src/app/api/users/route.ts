import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import { auth0 } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    // Get the Auth0 session directly
    const session = await auth0.getSession();

    if (!session || !session.user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { name, email } = session.user;

    if (!email) {
      return Response.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Extract additional fields from request body if needed
    const body = await req.json().catch(() => ({}));
    const additionalData = body || {};

    // Find existing user or create a new one
    // Using $set to avoid overwriting existing fields that aren't included in additionalData
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: name || email.split("@")[0],
          email,
          ...additionalData,
        },
      },
      { new: true, upsert: true }
    );

    return Response.json(
      { message: "User found or created successfully!", user },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to create user";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    // Get the Auth0 session directly
    const session = await auth0.getSession();

    if (!session || !session.user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { email } = session.user;

    if (!email) {
      return Response.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    await connectMongoDB();
    const requestBody = await req.json();
    const { jobTitle, masterResume } = requestBody;

    // Find the user
    const existingUser = await User.findOne({ email });

    if (!existingUser) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Update fields based on what's provided
    if (jobTitle !== undefined) {
      existingUser.jobTitle = jobTitle;
    }

    // Handle masterResume updates
    if (masterResume !== undefined) {
      // Always overwrite the existing masterResume with the new content
      existingUser.masterResume = masterResume;
    }

    // Save the updated document
    const updatedUser = await existingUser.save();

    return Response.json({
      message: "User updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "failed to update user";
    return Response.json(
      {
        error: message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get the Auth0 session directly
    const session = await auth0.getSession();

    if (!session || !session.user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get authenticated user's email
    const { email } = session.user;

    if (!email) {
      return Response.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Get the current user from MongoDB
    const user = await User.findOne({ email });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    return Response.json({ user });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch user";
    return Response.json({ error: message }, { status: 500 });
  }
}

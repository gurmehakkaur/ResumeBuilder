import connectMongoDB from "./mongodb";
import User from "@/models/User";

// Auth0 user type definition
export type Auth0User = {
  name?: string;
  email?: string;
  [key: string]: unknown;
};

/**
 * Ensures a user exists in the database based on their Auth0 profile
 * This function will find or create a user record in MongoDB
 */
export async function ensureUserExists(authUser: Auth0User) {
  if (!authUser || !authUser.email) {
    console.warn("Cannot ensure user exists: Missing email in auth user");
    return null;
  }

  try {
    await connectMongoDB();

    // Find or create user - we use $set to update basic user information on each login
    // This ensures the user's name stays in sync with their authentication provider
    // Other fields like masterResume are only updated through explicit API calls
    const user = await User.findOneAndUpdate(
      { email: authUser.email },
      {
        $set: {
          name: authUser.name || authUser.email.split("@")[0],
          email: authUser.email,
        },
      },
      { new: true, upsert: true }
    );

    return user;
  } catch (error) {
    console.error("Error ensuring user exists:", error);
    return null;
  }
}

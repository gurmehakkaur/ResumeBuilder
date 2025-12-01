import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth";
import connectMongoDB from "@/lib/mongodb";
import { ensureUserExists } from "@/lib/ensureUserExists";
import { quickValidateLatex, balanceLatexTags } from "@/lib/validateLatex";
import { generateCustomResume } from "@/lib/resumeGenerator";
import User from "@/models/User";
import { Document } from "mongoose";

// POST route to generate and save a customized resume
export async function POST(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get user session from Auth0
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure user exists in database
    const user = await ensureUserExists(session.user);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get request data
    const { company, jobTitle, jobDescription } = await req.json();

    // Validate input
    if (!company || !jobTitle || !jobDescription) {
      return NextResponse.json(
        { error: "Company name, job title and description are required" },
        { status: 400 }
      );
    }

    // Check if the user has a master resume
    if (!user.masterResume) {
      return NextResponse.json(
        { error: "Master resume not found" },
        { status: 404 }
      );
    }

    // Validate the master resume LaTeX content
    if (!quickValidateLatex(user.masterResume)) {
      return NextResponse.json(
        { error: "Master resume contains invalid LaTeX" },
        { status: 400 }
      );
    }

    // Generate a customized resume using Cohere API
    let customizedResume: string = "";
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        customizedResume = await generateCustomResume(
          user.masterResume,
          jobTitle,
          jobDescription
        );

        // Validate the generated LaTeX using quick validation only
        // This avoids the need for a LaTeX compiler
        if (!quickValidateLatex(customizedResume)) {
          console.warn(
            "Generated LaTeX has validation issues, attempting to fix..."
          );
          // Try to fix common issues
          const fixedResume = balanceLatexTags(customizedResume);

          if (!quickValidateLatex(fixedResume)) {
            throw new Error(
              "Generated resume contains invalid LaTeX that could not be fixed"
            );
          }

          customizedResume = fixedResume;
        }

        break; // If successful, exit the loop
      } catch (error) {
        if (attempts >= maxAttempts) {
          console.error(
            `Failed to generate valid LaTeX after ${maxAttempts} attempts:`,
            error
          );
          return NextResponse.json(
            {
              error:
                "Failed to generate valid LaTeX resume after multiple attempts",
              errorType: "invalid_generated_resume",
            },
            { status: 500 }
          );
        }
        console.warn(`Attempt ${attempts} failed, retrying...`);
        // Continue to next attempt
      }
    }

    // Create a new resume entry
    const newResume = {
      company,
      jobTitle,
      jobDescription,
      resume: customizedResume,
      createdAt: new Date(),
    };

    // Add the new resume to the user's resumes array
    user.resumes = user.resumes || [];
    user.resumes.push(newResume);

    // Save the updated user document
    await user.save();

    // Return the newly created resume
    return NextResponse.json({
      message: "Resume created successfully",
      resume: newResume,
    });
  } catch (error: Error | unknown) {
    console.error("Error in resume generation:", error);

    // Categorize errors for better client-side handling
    let status = 500;
    let errorType = "server_error";

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate resume";

    if (errorMessage.includes("Master resume contains invalid LaTeX")) {
      status = 400;
      errorType = "invalid_master_resume";
    } else if (
      errorMessage.includes("Generated resume contains invalid LaTeX")
    ) {
      status = 500;
      errorType = "invalid_generated_resume";
    } else if (errorMessage.includes("Cohere API")) {
      status = 503;
      errorType = "ai_service_error";
    } else if (
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("User not found")
    ) {
      status = 401;
      errorType = "auth_error";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        errorType,
      },
      { status }
    );
  }
}

// GET route to fetch all resumes for the authenticated user
export async function GET() {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get user session from Auth0
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find user in database
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user's resumes (empty array if none exist)
    const resumes = user.resumes || [];

    return NextResponse.json({
      resumes: resumes.map((resume: Document) => ({
        ...resume.toObject(),
        _id: (resume._id as { toString(): string }).toString(),
      })),
    });
  } catch (error: Error | unknown) {
    console.error("Error fetching resumes:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch resumes";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// DELETE route to remove a specific resume
export async function DELETE(req: NextRequest) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get user session from Auth0
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get resume ID from request body
    const { resumeId } = await req.json();

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Find user and remove the specific resume
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find and remove the resume by ID
    const initialLength = user.resumes.length;
    user.resumes = user.resumes.filter(
      (resume: Document) =>
        (resume._id as { toString(): string }).toString() !== resumeId
    );

    if (user.resumes.length === initialLength) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Save the updated user document
    await user.save();

    return NextResponse.json({
      message: "Resume deleted successfully",
    });
  } catch (error: Error | unknown) {
    console.error("Error deleting resume:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

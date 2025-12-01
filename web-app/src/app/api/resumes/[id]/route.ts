import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import { quickValidateLatex } from "@/lib/validateLatex";
import { Document } from "mongoose";

// PUT route to update a specific resume
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get user session from Auth0
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: resumeId } = await params;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Get request data
    const { company, jobTitle, jobDescription, resume } = await req.json();

    // Validate input
    if (!company || !jobTitle || !jobDescription || !resume) {
      return NextResponse.json(
        {
          error:
            "Company name, job title, description, and resume content are required",
        },
        { status: 400 }
      );
    }

    // Validate the LaTeX content
    if (!quickValidateLatex(resume)) {
      return NextResponse.json(
        { error: "Resume contains invalid LaTeX" },
        { status: 400 }
      );
    }

    // Find user and the specific resume
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the resume by ID
    const resumeIndex = user.resumes.findIndex(
      (resume: Document) =>
        (resume._id as { toString(): string }).toString() === resumeId
    );

    if (resumeIndex === -1) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Update the resume
    user.resumes[resumeIndex].company = company;
    user.resumes[resumeIndex].jobTitle = jobTitle;
    user.resumes[resumeIndex].jobDescription = jobDescription;
    user.resumes[resumeIndex].resume = resume;

    // Save the updated user document
    await user.save();

    return NextResponse.json({
      message: "Resume updated successfully",
      resume: user.resumes[resumeIndex],
    });
  } catch (error: Error | unknown) {
    console.error("Error updating resume:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET route to fetch a specific resume
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Connect to MongoDB
    await connectMongoDB();

    // Get user session from Auth0
    const session = await auth0.getSession();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: resumeId } = await params;

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume ID is required" },
        { status: 400 }
      );
    }

    // Find user and the specific resume
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Find the resume by ID
    const resume = user.resumes.find(
      (resume: Document) =>
        (resume._id as { toString(): string }).toString() === resumeId
    );

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    return NextResponse.json({
      resume: {
        ...resume.toObject(),
        _id: (resume._id as { toString(): string }).toString(),
      },
    });
  } catch (error: Error | unknown) {
    console.error("Error fetching resume:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

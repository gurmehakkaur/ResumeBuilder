import { NextRequest, NextResponse } from "next/server";
import { scoreResumeAgainstJob } from "@/lib/cohere";

export async function POST(request: NextRequest) {
  try {
    const { resumeLatex, jobDescription } = await request.json();

    if (!resumeLatex || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: resumeLatex and jobDescription" },
        { status: 400 }
      );
    }

    const result = await scoreResumeAgainstJob(resumeLatex, jobDescription);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error scoring resume:", error);
    return NextResponse.json(
      { error: "Failed to score resume. Please try again." },
      { status: 500 }
    );
  }
}

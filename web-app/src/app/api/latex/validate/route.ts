import { NextRequest, NextResponse } from "next/server";
import { quickValidateLatex, validateLatex } from "@/lib/validateLatex";

export async function POST(req: NextRequest) {
  try {
    // Get the LaTeX content from the request body
    const { content } = await req.json();

    // Validate that content was provided
    if (!content) {
      return NextResponse.json(
        { error: "No content provided" },
        { status: 400 }
      );
    }

    // Perform quick validation first
    const isQuickValid = quickValidateLatex(content);

    if (!isQuickValid) {
      return NextResponse.json({
        isValid: false,
        error: "The LaTeX content has syntax errors",
      });
    }

    // For more detailed validation, use the enhanced validateLatex function
    // This no longer tries to compile the LaTeX document but does additional checks
    const isFullyValid = await validateLatex(content);

    if (!isFullyValid) {
      return NextResponse.json({
        isValid: false,
        error: "The LaTeX content has structural errors",
      });
    }

    // Return validation result
    return NextResponse.json({
      isValid: true,
    });
  } catch (error) {
    console.error("Error validating LaTeX:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json(
      { error: errorMessage, isValid: false },
      { status: 500 }
    );
  }
}

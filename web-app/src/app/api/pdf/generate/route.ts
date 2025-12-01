import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

// Multiple PDF generation services as fallbacks
async function generatePdfWithExternalService(latex: string) {
  console.log("Using external service for PDF generation...");

  // Try multiple services in order of our preference
  const services = [
    {
      name: "latexonline.cc",
      url: `https://latexonline.cc/compile?text=${encodeURIComponent(latex)}`,
      maxLength: 8192,
      method: "GET",
    },
  ];

  // Check content length for services that have limitations
  if (latex.length > 8000) {
    console.log(
      "Content too large for URL-based services, providing alternatives..."
    );

    return NextResponse.json(
      {
        error: "LaTeX content is too large for online PDF generation",
        details: `Your resume content (${latex.length} characters) exceeds the limits of available online services.`,
        suggestions: [
          "Install TeX Live locally for unlimited size support",
          "Reduce your resume content length",
          "Break the resume into smaller sections",
          "Use the 'Copy LaTeX' option and compile manually",
        ],
        alternatives: [
          {
            name: "Copy LaTeX Code",
            description:
              "Copy the LaTeX code and paste it into Overleaf.com or LaTeX Online",
            action: "copy_latex",
          },
          {
            name: "Install TeX Live",
            description:
              "Install TeX Live locally for unlimited PDF generation",
            action: "install_texlive",
          },
          {
            name: "Use Overleaf",
            description:
              "Create a free account at overleaf.com and paste your LaTeX code",
            action: "use_overleaf",
          },
        ],
        latexContent: latex, // Include the LaTeX content for copying
      },
      { status: 413 }
    );
  }

  // Try the primary service for smaller content
  try {
    const service = services[0];
    const response = await fetch(service.url);

    if (response.ok) {
      const pdfBuffer = await response.arrayBuffer();
      console.log(
        `PDF generated successfully with ${service.name}, size:`,
        pdfBuffer.byteLength,
        "bytes"
      );

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="resume.pdf"',
        },
      });
    } else {
      throw new Error(`Service failed with status: ${response.status}`);
    }
  } catch {
    console.log("Primary service failed, providing alternatives...");

    return NextResponse.json(
      {
        error: "PDF generation service unavailable",
        details: "The online PDF generation service is currently unavailable.",
        suggestions: [
          "Try again in a few moments",
          "Use the 'Copy LaTeX' option and compile manually",
          "Install TeX Live locally for reliable PDF generation",
        ],
        alternatives: [
          {
            name: "Copy LaTeX Code",
            description:
              "Copy the LaTeX code and paste it into Overleaf.com or LaTeX Online",
            action: "copy_latex",
          },
          {
            name: "Install TeX Live",
            description:
              "Install TeX Live locally for unlimited PDF generation",
            action: "install_texlive",
          },
        ],
        latexContent: latex, // Include the LaTeX content for copying
      },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  let tempDir: string | null = null;
  let texFile: string | null = null;
  let pdfFile: string | null = null;

  try {
    // Get the LaTeX content from the request's body
    const { latex } = await request.json();

    // Check if the document is a proper LaTeX document
    if (
      !latex.includes("\\documentclass") &&
      !latex.includes("\\begin{document}")
    ) {
      return NextResponse.json(
        {
          error: "Invalid LaTeX format. Please provide a valid LaTeX document.",
        },
        { status: 400 }
      );
    }

    console.log("Received LaTeX content, converting to PDF...");
    console.log("LaTeX content length:", latex.length, "characters");

    // First, try TeX Live (local compilation)
    try {
      console.log("Attempting local TeX Live compilation...");

      // Check if pdflatex is available
      await execAsync("which pdflatex", { timeout: 5000 });

      // Create a temporary directory for compilation
      tempDir = await mkdtemp(join(tmpdir(), "latex-compile-"));
      texFile = join(tempDir, "resume.tex");
      pdfFile = join(tempDir, "resume.pdf");

      // Write LaTeX content to temporary file
      await writeFile(texFile, latex, "utf8");

      // Compile LaTeX to PDF using pdflatex
      console.log("Compiling LaTeX with pdflatex...");
      const { stdout, stderr } = await execAsync(
        `cd "${tempDir}" && pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texFile}"`,
        {
          timeout: 30000, // 30 second timeout
          maxBuffer: 1024 * 1024, // 1MB buffer
        }
      );

      console.log("pdflatex stdout:", stdout);
      if (stderr) {
        console.log("pdflatex stderr:", stderr);
      }

      // Check if PDF was generated successfully
      try {
        const fs = await import("fs/promises");
        await fs.access(pdfFile);
      } catch {
        throw new Error(
          `PDF compilation failed. LaTeX compilation may have errors. Check the LaTeX syntax.`
        );
      }

      // Read the generated PDF
      const fs = await import("fs/promises");
      const pdfBuffer = await fs.readFile(pdfFile);

      console.log(
        "PDF generated successfully with TeX Live, size:",
        pdfBuffer.length,
        "bytes"
      );

      // Return the PDF
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="resume.pdf"',
        },
      });
    } catch (texLiveError) {
      console.log(
        "TeX Live compilation failed, falling back to external service..."
      );
      console.log(
        "TeX Live error:",
        texLiveError instanceof Error ? texLiveError.message : "Unknown error"
      );

      // Clean up temp files if they exist
      if (tempDir) {
        try {
          const fs = await import("fs/promises");
          const files = await fs.readdir(tempDir);
          await Promise.all(files.map((file) => unlink(join(tempDir!, file))));
          await fs.rmdir(tempDir);
          tempDir = null;
        } catch (cleanupError) {
          console.error("Error cleaning up TeX Live temp files:", cleanupError);
        }
      }

      // Fallback to external service
      return await generatePdfWithExternalService(latex);
    }
  } catch (error) {
    console.error("Error in PDF generation:", error);

    // Provide better error messages for common LaTeX compilation errors
    let errorMessage = "Failed to generate PDF";
    let details = error instanceof Error ? error.message : "Unknown error";

    if (details.includes("timeout")) {
      errorMessage = "PDF generation timed out";
      details =
        "LaTeX compilation took too long. Please check for infinite loops or very complex documents.";
    } else if (details.includes("LaTeX Error")) {
      errorMessage = "LaTeX compilation error";
      details =
        "There are syntax errors in your LaTeX document. Please check the LaTeX syntax and try again.";
    } else if (details.includes("pdflatex: not found")) {
      errorMessage = "TeX Live not installed";
      details =
        "pdflatex is not installed on the server. Please install TeX Live or use a different PDF generation method.";
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: details,
      },
      { status: 500 }
    );
  } finally {
    // Clean up temporary files
    if (tempDir) {
      try {
        const fs = await import("fs/promises");
        const files = await fs.readdir(tempDir);
        await Promise.all(files.map((file) => unlink(join(tempDir!, file))));
        await fs.rmdir(tempDir);
        console.log("Cleaned up temporary files");
      } catch (cleanupError) {
        console.error("Error cleaning up temporary files:", cleanupError);
      }
    }
  }
}

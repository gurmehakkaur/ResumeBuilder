import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdtemp, readFile, access } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const execAsync = promisify(exec);

export interface PdfGenerationResult {
  pdfBuffer: Buffer;
  method: "texlive" | "external";
}

export interface PdfGenerationError {
  error: string;
  details: string;
  statusCode: number;
}

/**
 * Generates PDF from LaTeX content using external service (faster, optimized for serverless)
 * @param latex LaTeX content to compile
 * @returns PDF buffer or error
 */
async function generatePdfWithExternalService(
  latex: string
): Promise<Buffer> {
  // Check content length for services that have limitations
  if (latex.length > 8000) {
    throw new Error(
      `LaTeX content is too large (${latex.length} characters) for online PDF generation services. Maximum size is 8000 characters.`
    );
  }

  // Use latexonline.cc service
  const serviceUrl = `https://latexonline.cc/compile?text=${encodeURIComponent(
    latex
  )}`;

  try {
    const response = await fetch(serviceUrl, {
      method: "GET",
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(20000), // 20 second timeout
    });

    if (!response.ok) {
      throw new Error(`External service failed with status: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("PDF generation timed out after 20 seconds");
    }
    throw new Error(
      `External PDF generation service unavailable: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generates PDF from LaTeX content using TeX Live (local compilation)
 * @param latex LaTeX content to compile
 * @returns PDF buffer
 */
async function generatePdfWithTexLive(latex: string): Promise<Buffer> {
  let tempDir: string | null = null;

  try {
    // Check if pdflatex is available
    await execAsync("which pdflatex", { timeout: 5000 });

    // Create a temporary directory for compilation
    tempDir = await mkdtemp(join(tmpdir(), "latex-compile-"));
    const texFile = join(tempDir, "resume.tex");
    const pdfFile = join(tempDir, "resume.pdf");

    // Write LaTeX content to temporary file
    await writeFile(texFile, latex, "utf8");

    // Compile LaTeX to PDF using pdflatex
    // Reduced timeout to 20 seconds for faster failure in serverless
    await execAsync(
      `cd "${tempDir}" && pdflatex -interaction=nonstopmode -output-directory="${tempDir}" "${texFile}"`,
      {
        timeout: 20000, // 20 second timeout (reduced from 30)
        maxBuffer: 1024 * 1024, // 1MB buffer
      }
    );

    // Check if PDF was generated successfully
    try {
      await access(pdfFile);
    } catch {
      throw new Error(
        "PDF compilation failed. LaTeX compilation may have errors. Check the LaTeX syntax."
      );
    }

    // Read the generated PDF
    const pdfBuffer = await readFile(pdfFile);

    return pdfBuffer;
  } finally {
    // Clean up temporary files
    if (tempDir) {
      try {
        const files = await import("fs/promises");
        const fileList = await files.readdir(tempDir);
        await Promise.all(
          fileList.map((file) => unlink(join(tempDir!, file)))
        );
        await files.rmdir(tempDir);
      } catch (cleanupError) {
        console.error("Error cleaning up TeX Live temp files:", cleanupError);
        // Don't throw - cleanup errors shouldn't fail the operation
      }
    }
  }
}

/**
 * Generates a PDF from LaTeX content
 * Tries TeX Live first, falls back to external service
 * Optimized for serverless environments with reduced timeouts
 * @param latex LaTeX content to compile
 * @returns PDF buffer and generation method
 * @throws Error if PDF generation fails
 */
export async function generatePdfFromLatex(
  latex: string
): Promise<PdfGenerationResult> {
  // Validate LaTeX format
  if (
    !latex.includes("\\documentclass") &&
    !latex.includes("\\begin{document}")
  ) {
    throw new Error("Invalid LaTeX format. Please provide a valid LaTeX document.");
  }

  // First, try TeX Live (local compilation) - faster if available
  try {
    const pdfBuffer = await generatePdfWithTexLive(latex);
    return {
      pdfBuffer,
      method: "texlive",
    };
  } catch (texLiveError) {
    console.log(
      "TeX Live compilation failed, falling back to external service..."
    );
    console.log(
      "TeX Live error:",
      texLiveError instanceof Error ? texLiveError.message : "Unknown error"
    );

    // Fallback to external service
    try {
      const pdfBuffer = await generatePdfWithExternalService(latex);
      return {
        pdfBuffer,
        method: "external",
      };
    } catch (externalError) {
      const errorMessage =
        externalError instanceof Error
          ? externalError.message
          : "Unknown error";

      // Provide better error messages
      if (errorMessage.includes("timeout")) {
        throw new Error(
          "PDF generation timed out. The LaTeX compilation took too long."
        );
      } else if (errorMessage.includes("too large")) {
        throw new Error(
          "LaTeX content is too large for PDF generation. Please reduce the content size."
        );
      } else {
        throw new Error(
          `PDF generation failed: ${errorMessage}`
        );
      }
    }
  }
}


import { NextRequest, NextResponse } from "next/server";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import { scrapeLinkedInJob } from "@/lib/linkedinScraper";
import { generateCustomResume } from "@/lib/resumeGenerator";
import { generatePdfFromLatex } from "@/lib/pdfGenerator";
import { quickValidateLatex, balanceLatexTags } from "@/lib/validateLatex";

/**
 * POST /api/extension/resume/generate-from-linkedin
 * Generates a personalized resume from a LinkedIn job URL and returns it as a PDF
 * Requires Bearer token authentication
 */
export async function POST(req: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  console.log(
    `[${requestId}] POST /api/extension/resume/generate-from-linkedin - Request received`
  );

  try {
    // Get the Authorization header
    const authHeader = req.headers.get("authorization");
    console.log(`[${requestId}] Authorization header present:`, !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log(`[${requestId}] ERROR: No valid authorization header`);
      return NextResponse.json(
        { error: "No valid authorization header provided" },
        { status: 401 }
      );
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log(
      `[${requestId}] Session token extracted (length: ${sessionToken.length})`
    );

    // Validate user session by calling our users API
    const baseUrl = process.env.AUTH0_BASE_URL || "http://localhost:3000";
    const usersApiUrl = `${baseUrl}/api/users`;
    console.log(`[${requestId}] Validating session via: ${usersApiUrl}`);

    let userResponse;
    try {
      userResponse = await fetch(usersApiUrl, {
        method: "GET",
        headers: {
          Cookie: `__session=${sessionToken}`,
          "Content-Type": "application/json",
        },
      });
      console.log(
        `[${requestId}] User validation response status: ${userResponse.status}`
      );
    } catch (fetchError) {
      console.error(
        `[${requestId}] ERROR: Failed to fetch user validation:`,
        fetchError
      );
      return NextResponse.json(
        {
          error: `Failed to validate session: ${
            fetchError instanceof Error ? fetchError.message : "Unknown error"
          }`,
        },
        { status: 500 }
      );
    }

    if (!userResponse.ok) {
      const errorText = await userResponse.text().catch(() => "");
      console.error(
        `[${requestId}] ERROR: User validation failed (${userResponse.status}):`,
        errorText
      );
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    let userData;
    try {
      userData = await userResponse.json();
      console.log(
        `[${requestId}] User data retrieved, email:`,
        userData?.user?.email || "NOT FOUND"
      );
    } catch (parseError) {
      console.error(
        `[${requestId}] ERROR: Failed to parse user response:`,
        parseError
      );
      return NextResponse.json(
        { error: "Failed to parse user data" },
        { status: 500 }
      );
    }

    // Extract user information from the response
    if (!userData.user || !userData.user.email) {
      console.error(
        `[${requestId}] ERROR: Email not found in user data:`,
        JSON.stringify(userData)
      );
      return NextResponse.json(
        {
          error:
            "Email is required and not provided by authentication provider",
        },
        { status: 400 }
      );
    }

    const email = userData.user.email;
    console.log(`[${requestId}] Processing for user: ${email}`);

    // Connect to MongoDB
    console.log(`[${requestId}] Connecting to MongoDB...`);
    try {
      await connectMongoDB();
      console.log(`[${requestId}] MongoDB connected successfully`);
    } catch (dbError) {
      console.error(
        `[${requestId}] ERROR: MongoDB connection failed:`,
        dbError
      );
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Get the user from MongoDB
    console.log(`[${requestId}] Looking up user in database...`);
    let user;
    try {
      user = await User.findOne({ email });
      console.log(
        `[${requestId}] User lookup result:`,
        user ? `Found (has masterResume: ${!!user.masterResume})` : "NOT FOUND"
      );
    } catch (findError) {
      console.error(`[${requestId}] ERROR: User lookup failed:`, findError);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 }
      );
    }

    if (!user) {
      console.error(`[${requestId}] ERROR: User not found in database`);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if the user has a master resume
    if (!user.masterResume) {
      console.error(`[${requestId}] ERROR: Master resume not found`);
      return NextResponse.json(
        {
          error:
            "Master resume not found. Please create a master resume before generating custom resumes.",
          errorType: "master_resume_missing",
        },
        { status: 404 }
      );
    }

    // Validate the master resume LaTeX content
    console.log(`[${requestId}] Validating master resume LaTeX...`);
    const isValidLatex = quickValidateLatex(user.masterResume);
    console.log(`[${requestId}] LaTeX validation result:`, isValidLatex);

    if (!isValidLatex) {
      console.error(`[${requestId}] ERROR: Invalid LaTeX in master resume`);
      return NextResponse.json(
        {
          error:
            "Master resume contains invalid LaTeX. Please fix your master resume before generating custom resumes.",
          errorType: "invalid_master_resume",
        },
        { status: 400 }
      );
    }

    // Get LinkedIn URL from request body
    console.log(`[${requestId}] Parsing request body...`);
    let requestBody;
    try {
      requestBody = await req.json();
      console.log(`[${requestId}] Request body parsed:`, {
        hasLinkedInUrl: !!requestBody.linkedInUrl,
        hasUrl: !!requestBody.url,
        linkedInUrl: requestBody.linkedInUrl || requestBody.url || "NOT FOUND",
      });
    } catch (parseError) {
      console.error(
        `[${requestId}] ERROR: Failed to parse request body:`,
        parseError
      );
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { linkedInUrl } = requestBody;

    if (!linkedInUrl || typeof linkedInUrl !== "string") {
      console.error(
        `[${requestId}] ERROR: LinkedIn URL missing or invalid type:`,
        typeof linkedInUrl
      );
      return NextResponse.json(
        {
          error: "LinkedIn URL is required and must be a string",
          errorType: "invalid_input",
        },
        { status: 400 }
      );
    }

    const trimmedUrl = linkedInUrl.trim();
    console.log(`[${requestId}] LinkedIn URL trimmed:`, trimmedUrl);

    // Validate LinkedIn URL format
    if (!trimmedUrl.includes("linkedin.com/jobs")) {
      console.error(`[${requestId}] ERROR: Invalid LinkedIn URL format`);
      return NextResponse.json(
        {
          error:
            "Invalid LinkedIn job URL. Please provide a valid LinkedIn job posting URL.",
          errorType: "invalid_url",
        },
        { status: 400 }
      );
    }

    try {
      new URL(trimmedUrl);
      console.log(`[${requestId}] URL format validated`);
    } catch (urlError) {
      console.error(`[${requestId}] ERROR: Invalid URL format:`, urlError);
      return NextResponse.json(
        {
          error:
            "Invalid URL format. Please provide a valid LinkedIn job posting URL.",
          errorType: "invalid_url_format",
        },
        { status: 400 }
      );
    }

    // Step 1: Extract job data from LinkedIn URL
    // Optimized timeout: 30 seconds (reduced from 45s to leave more time for resume generation and PDF)
    console.log(
      `[${requestId}] Step 1: Extracting job data from LinkedIn URL...`
    );
    let jobData;
    try {
      jobData = await scrapeLinkedInJob(trimmedUrl, {
        timeout: 30000, // 30 seconds - optimized for serverless
        headless: true,
      });
      console.log(`[${requestId}] Job data extracted:`, {
        hasJobTitle: !!jobData?.jobTitle,
        hasJobDescription: !!jobData?.jobDescription,
        jobTitle: jobData?.jobTitle || "NOT FOUND",
        descriptionLength: jobData?.jobDescription?.length || 0,
      });
    } catch (scrapeError) {
      console.error(
        `[${requestId}] ERROR: LinkedIn scraping failed:`,
        scrapeError
      );
      throw scrapeError; // Re-throw to be caught by outer catch
    }

    // Validate extracted data
    if (!jobData.jobTitle || jobData.jobTitle === "Unknown Title") {
      console.error(`[${requestId}] ERROR: Job title extraction failed`);
      return NextResponse.json(
        {
          error:
            "We couldn't fetch job details from this link. The job title could not be extracted. Please verify the URL or enter the details manually.",
          errorType: "extraction_failed",
        },
        { status: 422 }
      );
    }

    if (!jobData.jobDescription || jobData.jobDescription.length < 50) {
      console.error(
        `[${requestId}] ERROR: Job description missing or too short (length: ${
          jobData.jobDescription?.length || 0
        })`
      );
      return NextResponse.json(
        {
          error:
            "Unable to locate job description. The job posting may require authentication or the description may be missing. Please enter the details manually.",
          errorType: "description_missing",
        },
        { status: 422 }
      );
    }

    const { companyName, jobTitle, jobDescription } = jobData;
    console.log(
      `[${requestId}] Job data validated - Company: ${companyName}, Title: ${jobTitle}`
    );

    // Step 2: Generate customized resume
    console.log(`[${requestId}] Step 2: Generating customized resume...`);
    let customizedResume: string = "";
    let attempts = 0;
    const maxAttempts = 2; // Reduced from 3 to save time

    while (attempts < maxAttempts) {
      attempts++;
      console.log(
        `[${requestId}] Resume generation attempt ${attempts}/${maxAttempts}...`
      );
      try {
        customizedResume = await generateCustomResume(
          user.masterResume,
          jobTitle,
          jobDescription
        );
        console.log(
          `[${requestId}] Resume generated (length: ${customizedResume.length} chars)`
        );

        // Validate the generated LaTeX
        const isValidGenerated = quickValidateLatex(customizedResume);
        console.log(
          `[${requestId}] Generated LaTeX validation:`,
          isValidGenerated
        );

        if (!isValidGenerated) {
          console.warn(
            `[${requestId}] Generated LaTeX has validation issues, attempting to fix...`
          );
          // Try to fix common issues
          const fixedResume = balanceLatexTags(customizedResume);
          const isFixedValid = quickValidateLatex(fixedResume);
          console.log(`[${requestId}] Fixed LaTeX validation:`, isFixedValid);

          if (!isFixedValid) {
            throw new Error(
              "Generated resume contains invalid LaTeX that could not be fixed"
            );
          }

          customizedResume = fixedResume;
          console.log(`[${requestId}] LaTeX fixed successfully`);
        }

        break; // If successful, exit the loop
      } catch (error) {
        console.error(
          `[${requestId}] Resume generation attempt ${attempts} failed:`,
          error
        );
        if (attempts >= maxAttempts) {
          console.error(
            `[${requestId}] ERROR: Failed to generate valid LaTeX after ${maxAttempts} attempts`
          );
          return NextResponse.json(
            {
              error:
                "Failed to generate valid LaTeX resume after multiple attempts. Please try again or check your master resume.",
              errorType: "resume_generation_failed",
            },
            { status: 500 }
          );
        }
        console.warn(`[${requestId}] Attempt ${attempts} failed, retrying...`);
        // Continue to next attempt
      }
    }

    // Step 3: Save resume to database
    console.log(`[${requestId}] Step 3: Saving resume to database...`);
    const newResume = {
      company: companyName || "Unknown Company",
      jobTitle,
      jobDescription,
      resume: customizedResume,
      createdAt: new Date(),
    };

    // Add the new resume to the user's resumes array
    user.resumes = user.resumes || [];
    user.resumes.push(newResume);

    try {
      await user.save();
      console.log(`[${requestId}] Resume saved to database successfully`);
    } catch (saveError) {
      console.error(
        `[${requestId}] ERROR: Failed to save resume to database:`,
        saveError
      );
      return NextResponse.json(
        { error: "Failed to save resume to database" },
        { status: 500 }
      );
    }

    // Get the ID of the newly saved resume (last item in the array)
    const savedResumeId = user.resumes[user.resumes.length - 1]._id?.toString();
    console.log(`[${requestId}] Saved resume ID:`, savedResumeId);

    // Step 4: Generate PDF from LaTeX
    console.log(`[${requestId}] Step 4: Generating PDF from LaTeX...`);
    let pdfResult;
    try {
      pdfResult = await generatePdfFromLatex(customizedResume);
      console.log(`[${requestId}] PDF generated successfully:`, {
        method: pdfResult?.method,
        size: pdfResult?.pdfBuffer?.length || 0,
      });
    } catch (pdfError) {
      console.error(`[${requestId}] ERROR: PDF generation failed:`, pdfError);

      // Even if PDF generation fails, the resume is saved to the database
      // Return an error but indicate the resume was saved
      const errorMessage =
        pdfError instanceof Error ? pdfError.message : "Unknown error";

      return NextResponse.json(
        {
          error: `Failed to generate PDF: ${errorMessage}`,
          errorType: "pdf_generation_failed",
          message:
            "Resume was saved to your account, but PDF generation failed.",
          resumeId: savedResumeId,
        },
        { status: 500 }
      );
    }

    // Step 5: Return PDF as binary response
    console.log(`[${requestId}] Step 5: Preparing PDF response...`);
    console.log(
      `[${requestId}] PDF generated successfully using ${pdfResult.method}, size: ${pdfResult.pdfBuffer.length} bytes`
    );

    // Create a filename with company and job title
    const sanitizedCompany = (companyName || "Company").replace(
      /[^a-z0-9]/gi,
      "_"
    );
    const sanitizedJobTitle = jobTitle.replace(/[^a-z0-9]/gi, "_");
    const filename = `resume_${sanitizedCompany}_${sanitizedJobTitle}.pdf`;
    console.log(`[${requestId}] Generated filename:`, filename);

    // Convert Buffer to Uint8Array for Response
    const pdfArray = new Uint8Array(pdfResult.pdfBuffer);
    console.log(`[${requestId}] PDF response prepared, returning...`);

    return new Response(pdfArray, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfResult.pdfBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error(
      `[${requestId}] ERROR: Unhandled error in LinkedIn-to-PDF resume generation:`,
      error
    );
    console.error(`[${requestId}] Error details:`, {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Network/timeout errors from LinkedIn scraping
      if (
        errorMessage.includes("timeout") ||
        errorMessage.includes("Navigation timeout")
      ) {
        return NextResponse.json(
          {
            error:
              "Request timed out. The LinkedIn page took too long to load. Please try again or verify the URL is accessible.",
            errorType: "timeout",
          },
          { status: 504 }
        );
      }

      // Network connectivity errors
      if (
        errorMessage.includes("net::ERR") ||
        errorMessage.includes("Network error")
      ) {
        return NextResponse.json(
          {
            error:
              "Network error. Unable to reach LinkedIn. Please check your internet connection and try again.",
            errorType: "network_error",
          },
          { status: 503 }
        );
      }

      // Invalid URL errors
      if (
        errorMessage.includes("Invalid LinkedIn job URL") ||
        errorMessage.includes("Invalid URL")
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid LinkedIn job URL. Please ensure the URL is a valid LinkedIn job posting link.",
            errorType: "invalid_url",
          },
          { status: 400 }
        );
      }

      // Description missing errors
      if (
        errorMessage.includes("Unable to locate job description") ||
        errorMessage.includes("description")
      ) {
        return NextResponse.json(
          {
            error:
              "Unable to locate job description. The job posting may require authentication or the description may be missing. Please enter the details manually.",
            errorType: "description_missing",
          },
          { status: 422 }
        );
      }

      // Extraction failed errors
      if (
        errorMessage.includes("Could not extract") ||
        errorMessage.includes("fetch job details")
      ) {
        return NextResponse.json(
          {
            error:
              "We couldn't fetch job details from this link. Please verify the URL or enter the details manually.",
            errorType: "extraction_failed",
          },
          { status: 422 }
        );
      }

      // PDF generation errors
      if (errorMessage.includes("PDF generation")) {
        return NextResponse.json(
          {
            error: errorMessage,
            errorType: "pdf_generation_failed",
          },
          { status: 500 }
        );
      }

      // Resume generation errors
      if (errorMessage.includes("LaTeX") || errorMessage.includes("resume")) {
        return NextResponse.json(
          {
            error: errorMessage,
            errorType: "resume_generation_failed",
          },
          { status: 500 }
        );
      }

      // Generic error
      return NextResponse.json(
        {
          error:
            errorMessage ||
            "Failed to generate resume from LinkedIn URL. Please try again.",
          errorType: "unknown_error",
        },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      {
        error:
          "Failed to generate resume. An unexpected error occurred. Please try again.",
        errorType: "unknown_error",
      },
      { status: 500 }
    );
  }
}

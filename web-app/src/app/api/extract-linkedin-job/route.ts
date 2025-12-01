import { NextRequest, NextResponse } from "next/server";
import { scrapeLinkedInJob } from "@/lib/linkedinScraper";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL is provided
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          error: "URL is required and must be a string",
          errorType: "invalid_input",
        },
        { status: 400 }
      );
    }

    // Validate LinkedIn URL format
    const trimmedUrl = url.trim();
    if (!trimmedUrl.includes("linkedin.com/jobs")) {
      return NextResponse.json(
        {
          error:
            "Invalid LinkedIn job URL. Please provide a valid LinkedIn job posting URL.",
          errorType: "invalid_url",
        },
        { status: 400 }
      );
    }

    // Validate URL format more strictly
    try {
      new URL(trimmedUrl);
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid URL format. Please provide a valid LinkedIn job posting URL.",
          errorType: "invalid_url_format",
        },
        { status: 400 }
      );
    }

    // Scrape the LinkedIn job posting
    // Set a longer timeout for serverless environments (Vercel has a 60s limit for Hobby, 300s for Pro)
    const jobData = await scrapeLinkedInJob(trimmedUrl, {
      timeout: 45000, // 45 seconds - leave buffer for Vercel's 60s limit
      headless: true,
    });

    // Validate that we got meaningful data
    if (!jobData.jobTitle || jobData.jobTitle === "Unknown Title") {
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
      return NextResponse.json(
        {
          error:
            "Unable to locate job description. The job posting may require authentication or the description may be missing. Please enter the details manually.",
          errorType: "description_missing",
        },
        { status: 422 }
      );
    }

    return NextResponse.json(jobData, { status: 200 });
  } catch (error) {
    console.error("Error scraping LinkedIn job:", error);

    // Handle specific error types
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Network/timeout errors
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

      // Generic error with the message
      return NextResponse.json(
        {
          error:
            errorMessage ||
            "Failed to extract job information from LinkedIn. Please try again or enter the details manually.",
          errorType: "unknown_error",
        },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      {
        error:
          "Failed to extract job information. An unexpected error occurred. Please try again or enter the details manually.",
        errorType: "unknown_error",
      },
      { status: 500 }
    );
  }
}

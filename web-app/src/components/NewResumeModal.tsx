"use client";
import { useState } from "react";

interface NewResumeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export default function NewResumeModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
}: NewResumeModalProps) {
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // Reset form when modal closes
  const handleClose = () => {
    if (!generating && !extracting) {
      setCompany("");
      setJobTitle("");
      setJobDescription("");
      setLinkedInUrl("");
      setError(null);
      setExtractionError(null);
      setExtractionSuccess(false);
      onClose();
    }
  };

  // Function to extract job data from LinkedIn URL
  const handleExtractFromLinkedIn = async () => {
    if (!linkedInUrl.trim()) {
      setExtractionError("Please enter a LinkedIn job URL");
      return;
    }

    // Basic URL validation
    if (!linkedInUrl.trim().includes("linkedin.com/jobs")) {
      setExtractionError(
        "Invalid LinkedIn job URL. Please provide a valid LinkedIn job posting URL."
      );
      return;
    }

    try {
      setExtracting(true);
      setExtractionError(null);
      setExtractionSuccess(false);

      const response = await fetch("/api/extract-linkedin-job", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: linkedInUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error types
        let errorMessage = data.error || "Failed to extract job information";

        if (
          data.errorType === "invalid_url" ||
          data.errorType === "invalid_url_format"
        ) {
          errorMessage =
            "Invalid LinkedIn job URL. Please ensure the URL is a valid LinkedIn job posting link.";
        } else if (data.errorType === "timeout") {
          errorMessage =
            "Request timed out. The LinkedIn page took too long to load. Please try again or verify the URL is accessible.";
        } else if (data.errorType === "network_error") {
          errorMessage =
            "Network error. Unable to reach LinkedIn. Please check your internet connection and try again.";
        } else if (data.errorType === "description_missing") {
          errorMessage =
            "Unable to locate job description. The job posting may require authentication or the description may be missing. Please enter the details manually.";
        } else if (data.errorType === "extraction_failed") {
          errorMessage =
            "We couldn't fetch job details from this link. Please verify the URL or enter the details manually.";
        }

        throw new Error(errorMessage);
      }

      // Auto-fill form fields with extracted data
      if (data.companyName && data.companyName !== "Unknown Company") {
        setCompany(data.companyName);
      }
      if (data.jobTitle && data.jobTitle !== "Unknown Title") {
        setJobTitle(data.jobTitle);
      }
      if (data.jobDescription) {
        setJobDescription(data.jobDescription);
      }

      setExtractionSuccess(true);
      setExtractionError(null);

      // Clear success message after 5 seconds
      setTimeout(() => {
        setExtractionSuccess(false);
      }, 5000);
    } catch (error) {
      console.error("Error extracting from LinkedIn:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to extract job information from LinkedIn";
      setExtractionError(errorMessage);
      setExtractionSuccess(false);
    } finally {
      setExtracting(false);
    }
  };

  // Function to generate a new resume
  const generateResume = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!company || !jobTitle || !jobDescription) {
      setError("Company name, job title and description are required");
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const response = await fetch("/api/resumes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          company,
          jobTitle,
          jobDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Create a user-friendly error message based on the error type
        let userMessage = errorData.error || "Failed to generate resume";

        if (errorData.errorType === "invalid_master_resume") {
          userMessage =
            "Your master resume has LaTeX formatting issues. Please fix it before generating a custom resume.";
        } else if (errorData.errorType === "invalid_generated_resume") {
          userMessage =
            "The AI couldn't generate a valid LaTeX resume. Try simplifying your master resume or job description.";
        } else if (errorData.errorType === "ai_service_error") {
          userMessage =
            "The AI service is currently unavailable. Please try again later.";
        }

        throw new Error(userMessage);
      }

      // Success! Clear form and close modal
      setCompany("");
      setJobTitle("");
      setJobDescription("");
      setLinkedInUrl("");
      setExtractionError(null);
      setExtractionSuccess(false);
      onClose();
      onSuccess(
        "Resume created successfully! Check your dashboard for the latest resume."
      );
    } catch (error) {
      console.error("Error generating resume:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate resume";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl p-6 my-8 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            Create Custom Resume
          </h2>
          <button
            onClick={handleClose}
            className={`text-gray-400 ${
              generating || extracting ? "hover:text-white" : ""
            } text-2xl`}
            disabled={generating || extracting}
          >
            &times;
          </button>
        </div>

        {/* LinkedIn URL Extraction Section - Moved to top for visibility */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg border border-gray-600">
          <label
            htmlFor="linkedin-url"
            className="block mb-2 text-white font-medium"
          >
            Paste a LinkedIn job URL (optional)
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="linkedin-url"
              value={linkedInUrl}
              onChange={(e) => {
                setLinkedInUrl(e.target.value);
                setExtractionError(null);
                setExtractionSuccess(false);
              }}
              className={`flex-1 bg-gray-600 text-white p-2 rounded border border-gray-500 focus:outline-none focus:border-blue-500 ${
                extracting || generating ? "opacity-50" : ""
              }`}
              placeholder="https://www.linkedin.com/jobs/view/..."
              disabled={extracting || generating}
            />
            <button
              type="button"
              onClick={handleExtractFromLinkedIn}
              disabled={extracting || generating || !linkedInUrl.trim()}
              className={`px-4 py-2 rounded text-white font-medium flex items-center justify-center whitespace-nowrap transition-colors ${
                extracting || generating || !linkedInUrl.trim()
                  ? "bg-gray-600 opacity-50 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {extracting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Extracting...
                </>
              ) : (
                "Extract"
              )}
            </button>
          </div>

          {/* Extraction Success Message */}
          {extractionSuccess && (
            <div className="mt-2 p-2 bg-green-700 text-white text-sm rounded">
              ✓ Job information extracted successfully! Review and edit the
              fields below if needed.
            </div>
          )}

          {/* Extraction Error Message */}
          {extractionError && (
            <div className="mt-2 p-2 bg-red-800 text-white text-sm rounded">
              <div className="font-bold mb-1">Extraction Error</div>
              <div>{extractionError}</div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-800 text-white p-3 mb-4 rounded">
            <div className="font-bold mb-1">Error</div>
            <div>{error}</div>
            {error.includes("LaTeX formatting issues") && (
              <div className="mt-2 text-sm">
                <p>Common LaTeX issues include:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Unbalanced brackets or braces</li>
                  <li>Missing \end{} tags for environments</li>
                  <li>Invalid LaTeX commands</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mb-4 border-t border-gray-600 pt-4">
          <p className="text-gray-400 text-sm mb-4">
            Or enter the details manually:
          </p>
        </div>

        <form onSubmit={generateResume}>
          <div className="mb-4">
            <label htmlFor="company" className="block mb-2 text-white">
              Company Name
            </label>
            <input
              type="text"
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={`w-full bg-gray-700 text-white p-2 rounded ${
                generating || extracting ? "opacity-50" : ""
              }`}
              placeholder="Google"
              required
              disabled={generating || extracting}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="jobTitle" className="block mb-2 text-white">
              Job Title
            </label>
            <input
              type="text"
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className={`w-full bg-gray-700 text-white p-2 rounded ${
                generating || extracting ? "opacity-50" : ""
              }`}
              placeholder="Software Engineer"
              required
              disabled={generating || extracting}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="jobDescription" className="block mb-2 text-white">
              Job Description
            </label>
            <textarea
              id="jobDescription"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className={`w-full bg-gray-700 text-white p-2 rounded ${
                generating || extracting ? "opacity-50" : ""
              }`}
              rows={6}
              placeholder="Paste the job description here..."
              required
              disabled={generating || extracting}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={handleClose}
              className={`px-4 py-2 bg-gray-600 text-white rounded ${
                generating || extracting
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gray-700"
              }`}
              disabled={generating || extracting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={generating || extracting}
              className={`px-4 py-2 rounded text-white flex items-center justify-center ${
                generating || extracting
                  ? "bg-blue-500 opacity-75"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {generating ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Generating...
                </>
              ) : (
                "Generate Resume"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

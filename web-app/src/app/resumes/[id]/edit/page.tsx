"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Resume {
  _id: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  resume: string;
  createdAt: string;
}

interface PdfError {
  error: string;
  details: string;
  suggestions?: string[];
  alternatives?: Array<{
    name: string;
    description: string;
    action: string;
  }>;
  latexContent?: string;
}

export default function EditResumePage() {
  const params = useParams();
  const resumeId = params.id as string;

  const [resume, setResume] = useState<Resume | null>(null);
  const [resumeContent, setResumeContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showPdfAlternatives, setShowPdfAlternatives] = useState(false);
  const [pdfError, setPdfError] = useState<PdfError | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [masterPreviewUrl, setMasterPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/resumes/${resumeId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch resume: ${response.status}`);
        }

        const data = await response.json();
        setResume(data.resume);
        setResumeContent(data.resume.resume);
      } catch (err) {
        console.error("Error fetching resume:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch resume");
      } finally {
        setLoading(false);
      }
    };

    if (resumeId) {
      fetchResume();
    }
  }, [resumeId]);

  const handleSaveChanges = async () => {
    try {
      setSaveStatus("Validating LaTeX...");

      // Validate the LaTeX content before saving
      const validation = await validateLatexContent(resumeContent);

      if (!validation.isValid) {
        setSaveStatus(`Invalid LaTeX: ${validation.error}`);
        setTimeout(() => setSaveStatus(null), 5000);
        return;
      }

      setSaveStatus("Saving...");
      const response = await fetch(`/api/resumes/${resumeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: resume?.company,
          jobTitle: resume?.jobTitle,
          jobDescription: resume?.jobDescription,
          resume: resumeContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to save changes: ${response.status}`
        );
      }

      setSaveStatus("Saved successfully!");
      setIsEditing(false);

      // Reset status message after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Error saving changes:", err);
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to save changes"
      );
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  // Validate LaTeX content client-side
  const validateLatexContent = async (
    content: string
  ): Promise<{ isValid: boolean; error?: string }> => {
    try {
      // Call the API to validate the LaTeX content
      const response = await fetch("/api/latex/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          isValid: false,
          error: data.error || "Failed to validate LaTeX content",
        };
      }

      const result = await response.json();
      return {
        isValid: result.isValid,
        error: result.error,
      };
    } catch (error) {
      console.warn(
        "Error calling LaTeX validation API, using fallback validation:",
        error
      );

      // Fallback validation
      const hasLatexCommands = /\\[a-zA-Z]+(\{|\s|$)/.test(content);

      // Check for balanced braces
      let braceCount = 0;
      for (let i = 0; i < content.length; i++) {
        if (content[i] === "{") braceCount++;
        if (content[i] === "}") braceCount--;
        if (braceCount < 0)
          return { isValid: false, error: "Unbalanced braces" };
      }

      if (braceCount !== 0)
        return { isValid: false, error: "Unbalanced braces" };

      return {
        isValid: hasLatexCommands,
        error: hasLatexCommands
          ? undefined
          : "Content doesn't appear to be LaTeX",
      };
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setSaveStatus("Generating PDF...");
      setShowPdfAlternatives(false);
      setPdfError(null);

      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: resumeContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Check if it's a size limit or service unavailable error with alternatives
        if (response.status === 413 || response.status === 503) {
          setPdfError(errorData);
          setShowPdfAlternatives(true);
          setSaveStatus(null);
          return;
        }

        throw new Error(errorData.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume?.jobTitle.replace(/\s+/g, "_")}_resume.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);

      setSaveStatus("PDF downloaded successfully!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Error generating PDF:", err);
      setSaveStatus(
        "Failed to generate PDF. Please ensure your resume is in LaTeX format."
      );
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handlePreviewPdf = async () => {
    try {
      setSaveStatus("Generating preview...");
      setShowPdfAlternatives(false);
      setPdfError(null);

      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: resumeContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 413 || response.status === 503) {
          const customError = {
            ...errorData,
            error: "Unable to render preview",
            details:
              "There may be syntax errors in your LaTeX code, or the PDF generation service is temporarily unavailable.",
          };
          setPdfError(customError);
          setShowPdfAlternatives(true);
          setSaveStatus(null);
          return;
        }

        throw new Error(errorData.error || "Failed to generate preview");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      setPreviewUrl(url);
      setShowPreview(true);
      setSaveStatus(null);
    } catch (err) {
      console.error("Error generating preview:", err);
      setSaveStatus(
        "Failed to generate preview. Please check your LaTeX syntax."
      );
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  const handleCompareWithMaster = async () => {
    try {
      setSaveStatus("Loading master resume...");

      // Fetch master resume
      const userResponse = await fetch("/api/users");
      if (!userResponse.ok) {
        throw new Error("Failed to fetch master resume");
      }

      const userData = await userResponse.json();
      if (!userData.user || !userData.user.masterResume) {
        setSaveStatus("No master resume found");
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }

      setSaveStatus("Generating comparison previews...");

      // Generate PDF for current resume
      const currentResponse = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: resumeContent }),
      });

      if (!currentResponse.ok) {
        const errorData = await currentResponse.json();
        throw new Error(
          errorData.error || "Failed to generate current resume preview"
        );
      }

      const currentBlob = await currentResponse.blob();
      const currentUrl = window.URL.createObjectURL(currentBlob);
      setPreviewUrl(currentUrl);

      // Generate PDF for master resume
      const masterResponse = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: userData.user.masterResume }),
      });

      if (!masterResponse.ok) {
        const errorData = await masterResponse.json();
        throw new Error(
          errorData.error || "Failed to generate master resume preview"
        );
      }

      const masterBlob = await masterResponse.blob();
      const masterUrl = window.URL.createObjectURL(masterBlob);
      setMasterPreviewUrl(masterUrl);

      setShowComparison(true);
      setSaveStatus(null);
    } catch (err) {
      console.error("Error generating comparison:", err);
      setSaveStatus(
        err instanceof Error ? err.message : "Failed to generate comparison"
      );
      setTimeout(() => setSaveStatus(null), 5000);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#181718",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "18px", color: "#4e5cff" }}>
          Loading resume...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#181718",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "18px", color: "#ff4d4d" }}>Error: {error}</div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#181718",
          padding: "2rem",
        }}
      >
        <div style={{ fontSize: "18px", color: "#ff4d4d" }}>
          Resume not found
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        background: "#181718",
        minHeight: "100vh",
        padding: "2rem",
        color: "#f9f3e7",
      }}
    >
      {/* Top Section: Company Name (left) + Back Button (right) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h1
          style={{
            color: "#fff",
            fontSize: "2rem",
            fontWeight: "700",
            margin: "0",
            letterSpacing: "1px",
          }}
        >
          {resume.company}
        </h1>
        <Link
          href="/resumes"
          style={{
            background: "#4e5cff",
            color: "#fff",
            border: "none",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 16px rgba(78, 92, 255, 0.3)",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#3d4bff";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow =
              "0 6px 20px rgba(78, 92, 255, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4e5cff";
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow =
              "0 4px 16px rgba(78, 92, 255, 0.3)";
          }}
        >
          Back to Resumes
        </Link>
      </div>

      {/* Job Title */}
      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <h2
          style={{
            color: "#b2c2c9",
            fontSize: "1.5rem",
            fontWeight: "600",
            margin: "0",
          }}
        >
          {resume.jobTitle}
        </h2>
      </div>

      {/* Main Content: Resume Editor (left) + Action Buttons (right) */}
      <div
        style={{
          display: "flex",
          gap: "2rem",
          alignItems: "flex-start",
        }}
      >
        {/* Left Side: Resume Content */}
        <div
          style={{
            background: "#232124",
            border: "1px solid #444",
            borderRadius: "24px",
            width: "700px",
            height: "800px",
            boxShadow: "0 4px 32px #000a",
            padding: "2rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-start",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isEditing ? (
            <textarea
              value={resumeContent}
              onChange={(e) => setResumeContent(e.target.value)}
              style={{
                width: "100%",
                height: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                color: "#f9f3e7",
                fontSize: "12px",
                fontFamily: "monospace",
                overflowY: "auto",
                textAlign: "left",
                padding: "1rem",
                background: "#1e1e1e",
                borderRadius: "8px",
                border: "1px solid #00e5ff", // Highlight when editing
                resize: "none",
              }}
            />
          ) : (
            <pre
              style={{
                width: "100%",
                height: "100%",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
                color: "#f9f3e7",
                fontSize: "12px",
                fontFamily: "monospace",
                overflowY: "auto",
                textAlign: "left",
                padding: "1rem",
                background: "#1e1e1e",
                borderRadius: "8px",
                border: "1px solid #333",
              }}
            >
              {resumeContent}
            </pre>
          )}
        </div>

        {/* Right Side: Action Buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {isEditing ? (
            <button
              onClick={handleSaveChanges}
              style={{
                background: "#7c6f8e",
                color: "#f9f3e7",
                border: "none",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "16px",
                padding: "12px 24px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(124, 111, 142, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 10px rgba(124, 111, 142, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(124, 111, 142, 0.2)";
              }}
            >
              Save Changes
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: "#5c4f6e",
                color: "#f9f3e7",
                border: "none",
                borderRadius: "12px",
                fontWeight: "700",
                fontSize: "16px",
                padding: "12px 24px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(92, 79, 110, 0.2)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 10px rgba(92, 79, 110, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(92, 79, 110, 0.2)";
              }}
            >
              Edit Resume
            </button>
          )}

          <button
            onClick={handleDownloadPdf}
            style={{
              background: "#2a2a2a",
              color: "#f9f3e7",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "16px",
              padding: "12px 24px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(42, 42, 42, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 10px rgba(42, 42, 42, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 6px rgba(42, 42, 42, 0.2)";
            }}
          >
            Download PDF
          </button>

          <button
            onClick={handlePreviewPdf}
            style={{
              background: "#d4c5b0",
              color: "#2a2a2a",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "16px",
              padding: "12px 24px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(212, 197, 176, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 10px rgba(212, 197, 176, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 6px rgba(212, 197, 176, 0.2)";
            }}
          >
            Preview Resume
          </button>

          <button
            onClick={handleCompareWithMaster}
            style={{
              background: "#8d7ba3",
              color: "#f9f3e7",
              border: "none",
              borderRadius: "12px",
              fontWeight: "700",
              fontSize: "16px",
              padding: "12px 24px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              boxShadow: "0 2px 6px rgba(141, 123, 163, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 4px 10px rgba(141, 123, 163, 0.25)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 2px 6px rgba(141, 123, 163, 0.2)";
            }}
          >
            Compare with Master
          </button>

          {saveStatus && (
            <div
              style={{
                padding: "10px",
                color: saveStatus.includes("Failed") ? "#ff4d4d" : "#4eff9f",
                textAlign: "center",
                fontSize: "14px",
              }}
            >
              {saveStatus}
            </div>
          )}
        </div>
      </div>

      {/* PDF Alternatives Modal */}
      {showPdfAlternatives && pdfError && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <div
            style={{
              background: "#232124",
              border: "1px solid #444",
              borderRadius: 24,
              maxWidth: 600,
              width: "100%",
              maxHeight: "80vh",
              overflow: "auto",
              padding: "2rem",
              boxShadow: "0 4px 32px #000a",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <h2
                style={{
                  color: "#f9f3e7",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                PDF Generation Options
              </h2>
              <button
                onClick={() => setShowPdfAlternatives(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f9f3e7",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <p style={{ color: "#ff4d4d", marginBottom: "1rem" }}>
                {pdfError.error}
              </p>
              <p style={{ color: "#b2c2c9", marginBottom: "1rem" }}>
                {pdfError.details}
              </p>

              {pdfError.suggestions && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <h3 style={{ color: "#f9f3e7", marginBottom: "0.5rem" }}>
                    Suggestions:
                  </h3>
                  <ul style={{ color: "#b2c2c9", paddingLeft: "1.5rem" }}>
                    {pdfError.suggestions.map(
                      (suggestion: string, index: number) => (
                        <li key={index} style={{ marginBottom: "0.25rem" }}>
                          {suggestion}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>

            {pdfError.alternatives && (
              <div>
                <h3 style={{ color: "#f9f3e7", marginBottom: "1rem" }}>
                  Alternative Options:
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {pdfError.alternatives.map((alternative, index: number) => (
                    <div
                      key={index}
                      style={{
                        background: "#1a1a1a",
                        border: "1px solid #333",
                        borderRadius: "8px",
                        padding: "1rem",
                      }}
                    >
                      <h4 style={{ color: "#4eff9f", margin: "0 0 0.5rem 0" }}>
                        {alternative.name}
                      </h4>
                      <p style={{ color: "#b2c2c9", margin: "0 0 1rem 0" }}>
                        {alternative.description}
                      </p>

                      {alternative.action === "copy_latex" && (
                        <button
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(
                                resumeContent
                              );
                              alert("LaTeX code copied to clipboard!");
                              setShowPdfAlternatives(false);
                            } catch (err) {
                              console.error("Failed to copy:", err);
                              alert(
                                "Failed to copy. Please manually select and copy the LaTeX content."
                              );
                            }
                          }}
                          style={{
                            background: "#4eff9f",
                            color: "#000",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          Copy LaTeX Code
                        </button>
                      )}

                      {alternative.action === "use_overleaf" && (
                        <button
                          onClick={() => {
                            window.open("https://www.overleaf.com/", "_blank");
                          }}
                          style={{
                            background: "#4361ee",
                            color: "#fff",
                            border: "none",
                            borderRadius: "6px",
                            padding: "0.5rem 1rem",
                            cursor: "pointer",
                            fontWeight: "bold",
                          }}
                        >
                          Open Overleaf
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {showPreview && previewUrl && (
        <div
          onClick={() => {
            setShowPreview(false);
            if (previewUrl) {
              window.URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#232124",
              border: "1px solid #444",
              borderRadius: 24,
              width: "90%",
              height: "90%",
              maxWidth: "1200px",
              boxShadow: "0 4px 32px #000a",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.5rem",
                borderBottom: "1px solid #444",
              }}
            >
              <h2
                style={{
                  color: "#f9f3e7",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Resume Preview
              </h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  if (previewUrl) {
                    window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f9f3e7",
                  fontSize: "2rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <iframe
              src={previewUrl}
              style={{
                flex: 1,
                width: "100%",
                border: "none",
              }}
              title="Resume Preview"
            />
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && previewUrl && masterPreviewUrl && (
        <div
          onClick={() => {
            setShowComparison(false);
            if (previewUrl) {
              window.URL.revokeObjectURL(previewUrl);
              setPreviewUrl(null);
            }
            if (masterPreviewUrl) {
              window.URL.revokeObjectURL(masterPreviewUrl);
              setMasterPreviewUrl(null);
            }
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#232124",
              border: "1px solid #444",
              borderRadius: 24,
              width: "95%",
              height: "90%",
              maxWidth: "1800px",
              boxShadow: "0 4px 32px #000a",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "1.5rem",
                borderBottom: "1px solid #444",
              }}
            >
              <h2
                style={{
                  color: "#f9f3e7",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: 0,
                }}
              >
                Resume Comparison
              </h2>
              <button
                onClick={() => {
                  setShowComparison(false);
                  if (previewUrl) {
                    window.URL.revokeObjectURL(previewUrl);
                    setPreviewUrl(null);
                  }
                  if (masterPreviewUrl) {
                    window.URL.revokeObjectURL(masterPreviewUrl);
                    setMasterPreviewUrl(null);
                  }
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#f9f3e7",
                  fontSize: "2rem",
                  cursor: "pointer",
                  padding: "0.5rem",
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                flex: 1,
                display: "flex",
                gap: "1rem",
                padding: "1rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <h3
                  style={{
                    color: "#00e5ff",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  Generated Resume
                </h3>
                <iframe
                  src={previewUrl}
                  style={{
                    flex: 1,
                    width: "100%",
                    border: "1px solid #444",
                    borderRadius: "12px",
                  }}
                  title="Generated Resume Preview"
                />
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <h3
                  style={{
                    color: "#4eff9f",
                    fontSize: "1.2rem",
                    fontWeight: "600",
                    marginBottom: "0.5rem",
                    textAlign: "center",
                  }}
                >
                  Master Resume
                </h3>
                <iframe
                  src={masterPreviewUrl}
                  style={{
                    flex: 1,
                    width: "100%",
                    border: "1px solid #444",
                    borderRadius: "12px",
                  }}
                  title="Master Resume Preview"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

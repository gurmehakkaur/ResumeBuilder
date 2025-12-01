"use client";
import { useState, useEffect } from "react";
import ResumeTemplateModal from "./ResumeTemplateModal";
import { ResumeTemplate } from "@/lib/templates/resumeTemplates";
import ResumeActions from "./ResumeActions";

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

export default function MasterResume() {
  const [resumeContent, setResumeContent] = useState("");
  const [previousContent, setPreviousContent] = useState("");
  const [isResumeVisible, setIsResumeVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadInput, setUploadInput] = useState<File | null>(null);
  const [showPdfAlternatives, setShowPdfAlternatives] = useState(false);
  const [pdfError, setPdfError] = useState<PdfError | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Save resume content to the backend
  const saveResume = async (content: string) => {
    try {
      setSaveStatus("Validating...");
      // First validate the LaTeX content
      const validation = await validateLatexContent(content);

      if (!validation.isValid) {
        setSaveStatus(`Invalid LaTeX: ${validation.error}`);
        setTimeout(() => setSaveStatus(null), 5000);
        throw new Error(`Invalid LaTeX: ${validation.error}`);
      }

      setSaveStatus("Saving...");
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterResume: content }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to save changes: ${response.status}`
        );
      }

      setSaveStatus("Saved successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Failed to save changes. Please try again."
      );
      throw error;
    }
  };

  const handleTemplateSelect = async (template: ResumeTemplate) => {
    try {
      // Set loading state
      setLoading(true);
      setSaveStatus("Applying template...");

      // First update local state so user sees the change immediately
      setResumeContent(template.content);
      setIsEditing(true);
      setIsResumeVisible(true);
      setShowTemplateModal(false);

      // Then save to backend
      await saveResume(template.content);
      setSaveStatus("Template applied successfully");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      console.error("Error applying template:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to apply template. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Fetch the user's master resume when component mounts
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/users");

        if (!response.ok) {
          throw new Error(`Failed to fetch user data: ${response.status}`);
        }

        const data = await response.json();

        // Check if user has a masterResume
        if (data.user && data.user.masterResume) {
          setResumeContent(data.user.masterResume);
          setIsResumeVisible(true);
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Handle updating the existing master resume
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
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ masterResume: resumeContent }),
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

  // Handle uploading a file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadInput(e.target.files[0]);
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
      // Fallback validation using simple regex patterns if API call fails
      // This is not as accurate as server-side validation but provides immediate feedback
      console.warn(
        "Error calling LaTeX validation API, using fallback validation:",
        error
      );

      // Check for basic LaTeX structure
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

  // Handle uploading a new master resume
  const handleUploadFile = () => {
    if (!uploadInput) return;

    setUploadStatus("Reading file...");
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        if (!e.target || !e.target.result) {
          throw new Error("Failed to read file");
        }

        // Properly handle different result types
        const fileContent =
          typeof e.target.result === "string"
            ? e.target.result
            : new TextDecoder().decode(e.target.result as ArrayBuffer);

        // Validate the LaTeX content
        setUploadStatus("Validating LaTeX...");
        const validation = await validateLatexContent(fileContent);

        if (!validation.isValid) {
          throw new Error(`Invalid LaTeX content: ${validation.error}`);
        }

        setUploadStatus("Uploading...");

        // Upload the file content as the new master resume
        const response = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            masterResume: fileContent,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `Failed to upload: ${response.status}`
          );
        }

        setResumeContent(fileContent);
        setIsResumeVisible(true);
        setUploadStatus("Uploaded successfully!");

        // Reset status and input after 3 seconds
        setTimeout(() => {
          setUploadStatus(null);
          setUploadInput(null);
        }, 3000);
      } catch (err) {
        console.error("Error uploading file:", err);
        setUploadStatus(
          err instanceof Error ? err.message : "Failed to upload file"
        );
        setTimeout(() => setUploadStatus(null), 5000);
      }
    };

    reader.onerror = () => {
      setUploadStatus("Error reading file");
      setTimeout(() => setUploadStatus(null), 3000);
    };

    reader.readAsText(uploadInput);
  };

  // for previewing the PDF
  const handlePreviewPDF = async () => {
    try {
      setSaveStatus("Generating preview...");

      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: resumeContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();

        if (response.status === 413 || response.status === 503) {
          // Customize the error message for preview to mention syntax issues
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

  // Handle user choosing to add/create a new master resume when they don't have one
  const handleCreateNew = () => {
    setResumeContent("");
    setIsResumeVisible(true);
    setIsEditing(true);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <div style={{ fontSize: "18px", color: "#4e5cff" }}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "300px",
        }}
      >
        <div style={{ fontSize: "18px", color: "#ff4d4d" }}>Error: {error}</div>
      </div>
    );
  }

  return (
    <>
      <ResumeTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateSelect={handleTemplateSelect}
      />
      {!isResumeVisible ? (
        // =================================
        // Initial View: No Master Resume Yet
        // =================================
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#232124",
              border: "2.5px solid #4e5cff",
              borderRadius: 24,
              width: 650,
              minHeight: 500,
              boxShadow: "0 4px 32px #000a",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              textAlign: "center",
              padding: "20px",
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: 1,
                marginBottom: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span>Upload your master resume here</span>
              <div style={{ marginTop: "20px" }}>
                <input
                  type="file"
                  id="resume-upload"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="resume-upload"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <svg
                    width="38"
                    height="38"
                    fill="#4e5cff"
                    viewBox="0 0 24 24"
                    style={{ marginRight: "10px" }}
                  >
                    <path
                      d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                      stroke="#4e5cff"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span style={{ color: "#4e5cff" }}>Select File</span>
                </label>
                {uploadInput && (
                  <div style={{ marginTop: "10px", fontSize: "14px" }}>
                    Selected: {uploadInput.name}
                  </div>
                )}
              </div>
              {uploadStatus && (
                <div
                  style={{
                    marginTop: "10px",
                    color: uploadStatus.includes("Failed")
                      ? "#ff4d4d"
                      : "#4eff9f",
                    fontSize: "14px",
                  }}
                >
                  {uploadStatus}
                </div>
              )}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginLeft: 36,
            }}
          >
            {uploadInput && (
              <button
                onClick={handleUploadFile}
                style={{
                  background: "transparent",
                  color: "#4e5cff",
                  border: "2px solid #4e5cff",
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 16,
                  padding: "12px 22px",
                  cursor: "pointer",
                  transition: "background 0.2s, color 0.2s",
                  boxShadow: "0 2px 8px #4e5cff33",
                }}
              >
                Upload Selected File
              </button>
            )}
            <button
              onClick={() => setShowTemplateModal(true)}
              style={{
                background: "transparent",
                color: "#4eff9f",
                border: "2px solid #4eff9f",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 22px",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
                boxShadow: "0 2px 8px #4eff9f33",
                marginBottom: "10px",
              }}
            >
              Choose Template
            </button>
            <button
              onClick={handleCreateNew}
              style={{
                background: "transparent",
                color: "#4eff9f",
                border: "2px solid #4eff9f",
                borderRadius: 14,
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 22px",
                cursor: "pointer",
                transition: "background 0.2s, color 0.2s",
                boxShadow: "0 2px 8px #4eff9f33",
              }}
            >
              Create New Resume
            </button>
          </div>
        </div>
      ) : (
        // =================================
        // View After Upload: Resume Preview
        // =================================
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
              borderRadius: 24,
              width: 700,
              height: 800,
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
              gap: 20,
            }}
          >
            {isEditing ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <button
                  onClick={handleSaveChanges}
                  style={{
                    background: "#4eff9f",
                    color: "#000",
                    border: "2px solid #4eff9f",
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "12px 22px",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    boxShadow: "0 2px 8px #4eff9f33",
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => {
                    setResumeContent(previousContent);
                    setIsEditing(false);
                    setSaveStatus("Changes cancelled");
                    setTimeout(() => setSaveStatus(null), 3000);
                  }}
                  style={{
                    background: "transparent",
                    color: "#ff4d4d",
                    border: "2px solid #ff4d4d",
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 16,
                    padding: "12px 22px",
                    cursor: "pointer",
                    transition: "all 0.2s ease-in-out",
                    boxShadow: "0 2px 8px #ff4d4d33",
                  }}
                >
                  Cancel Changes
                </button>
              </div>
            ) : (
              <ResumeActions
                onEditClick={() => setIsEditing(true)}
                onReplaceMaster={() => {
                  const input = document.getElementById(
                    "resume-replace"
                  ) as HTMLInputElement;
                  if (input) input.click();
                }}
                onPreviewPDF={handlePreviewPDF}
                onDownloadPDF={async () => {
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

                      throw new Error(
                        errorData.error || "Failed to generate PDF"
                      );
                    }

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "resume.pdf";
                    a.click();

                    setSaveStatus("PDF downloaded successfully!");
                    setTimeout(() => setSaveStatus(null), 3000);
                  } catch (err) {
                    console.error("Error generating PDF:", err);
                    setSaveStatus(
                      "Failed to generate PDF. Please ensure your resume is in LaTeX format."
                    );
                    setTimeout(() => setSaveStatus(null), 5000);
                  }
                }}
                onDownloadMaster={() => {
                  const blob = new Blob([resumeContent], {
                    type: "text/plain",
                  });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "master-resume.tex";
                  a.click();
                }}
                onTemplateSelect={(template: ResumeTemplate) => {
                  // Store the current content before applying template
                  setPreviousContent(resumeContent);
                  // Just set the content without saving
                  setResumeContent(template.content);
                  setIsEditing(true);
                  setIsResumeVisible(true);
                }}
                onSave={handleSaveChanges}
                onCancel={() => {
                  // Restore the previous content
                  setResumeContent(previousContent);
                  setIsEditing(false);
                  setSaveStatus("Changes cancelled");
                  setTimeout(() => setSaveStatus(null), 3000);
                }}
                showSaveButton={isEditing}
              />
            )}

            {saveStatus && (
              <div
                style={{
                  position: "fixed",
                  top: "20px",
                  right: "20px",
                  padding: "12px 20px",
                  background: "#1a1a1a",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: saveStatus.includes("Failed") ? "#ff4d4d" : "#fff",
                  fontSize: "14px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  zIndex: 1000,
                }}
              >
                {saveStatus}
              </div>
            )}
          </div>

          <div style={{ display: "none" }}>
            <input
              type="file"
              id="resume-replace"
              onChange={handleFileChange}
            />
            {uploadInput && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "14px",
                  color: "#fff",
                  textAlign: "center",
                }}
              >
                Selected: {uploadInput.name}
                <button
                  onClick={handleUploadFile}
                  style={{
                    display: "block",
                    margin: "10px auto",
                    background: "transparent",
                    color: "#4e5cff",
                    border: "2px solid #4e5cff",
                    borderRadius: 14,
                    fontWeight: 700,
                    fontSize: 14,
                    padding: "8px 16px",
                    cursor: "pointer",
                  }}
                >
                  Upload Now
                </button>
              </div>
            )}
            {uploadStatus && (
              <div
                style={{
                  marginTop: "10px",
                  color: uploadStatus.includes("Failed")
                    ? "#ff4d4d"
                    : "#4eff9f",
                  textAlign: "center",
                }}
              >
                {uploadStatus}
              </div>
            )}
          </div>
        </div>
      )}

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
    </>
  );
}

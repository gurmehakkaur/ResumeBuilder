"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import NewResumeModal from "@/components/NewResumeModal";

interface Resume {
  _id: string;
  company: string;
  jobTitle: string;
  jobDescription: string;
  resume: string;
  createdAt: string;
}

interface ScoringResult {
  score: number;
  pros: string[];
  cons: string[];
}

export default function MyResumes() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scoringModalOpen, setScoringModalOpen] = useState(false);
  const [selectedResumeForScoring, setSelectedResumeForScoring] = useState<
    string | null
  >(null);
  const [jobDescriptionForScoring, setJobDescriptionForScoring] = useState("");
  const [scoringResult, setScoringResult] = useState<ScoringResult | null>(
    null
  );
  const [scoringLoading, setScoringLoading] = useState(false);

  const itemsPerPage = 10;

  // Fetch resumes when component mounts
  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setLoading(true);
      setFetchError(null);

      const response = await fetch("/api/resumes");

      if (!response.ok) {
        throw new Error(`Failed to fetch resumes: ${response.status}`);
      }

      const data = await response.json();
      setResumes(data.resumes || []);
    } catch (err) {
      console.error("Error fetching resumes:", err);
      setFetchError(
        err instanceof Error ? err.message : "Failed to fetch resumes"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    // Refresh the resumes list after successful creation
    fetchResumes();
  };

  const handleError = (message: string) => {
    if (!isModalOpen) {
      setError(message);
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this resume? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingId(resumeId);

      const response = await fetch("/api/resumes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ resumeId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete resume");
      }

      // Clear scoring cache for this resume
      try {
        localStorage.removeItem(`scoring_${resumeId}`);
      } catch (err) {
        console.error("Error clearing scoring cache:", err);
      }

      setResumes(resumes.filter((resume) => resume._id !== resumeId));
      setSuccess("Resume deleted successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error("Error deleting resume:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete resume"
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditResume = (resumeId: string) => {
    // Clear scoring cache since the resume content will be modified
    try {
      localStorage.removeItem(`scoring_${resumeId}`);
    } catch (err) {
      console.error("Error clearing scoring cache:", err);
    }
    router.push(`/resumes/${resumeId}/edit`);
  };

  const handleDownloadResume = async (resume: Resume) => {
    try {
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latex: resume.resume }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.jobTitle.replace(/\s+/g, "_")}_resume.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setError("Failed to generate PDF. Please try again.");
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleOpenScoringModal = (resumeId: string) => {
    setSelectedResumeForScoring(resumeId);
    setScoringModalOpen(true);
    setJobDescriptionForScoring("");

    // Load cached scoring result for this resume if it exists
    try {
      const cachedResult = localStorage.getItem(`scoring_${resumeId}`);
      if (cachedResult) {
        setScoringResult(JSON.parse(cachedResult));
      } else {
        setScoringResult(null);
      }
    } catch (err) {
      console.error("Error loading cached scoring result:", err);
      setScoringResult(null);
    }
  };

  const handleCloseScoringModal = () => {
    // Cache the current scoring result if it exists
    if (selectedResumeForScoring && scoringResult) {
      try {
        localStorage.setItem(
          `scoring_${selectedResumeForScoring}`,
          JSON.stringify(scoringResult)
        );
      } catch (err) {
        console.error("Error caching scoring result:", err);
      }
    }

    setScoringModalOpen(false);
    setSelectedResumeForScoring(null);
    setJobDescriptionForScoring("");
  };

  const handleSubmitScoring = async () => {
    if (!jobDescriptionForScoring.trim()) {
      setError("Please enter a job description");
      return;
    }

    try {
      setScoringLoading(true);
      setError(null);

      // Find the selected resume
      const resume = resumes.find((r) => r._id === selectedResumeForScoring);
      if (!resume) {
        setError("Resume not found");
        return;
      }

      // Call the scoring API
      const response = await fetch("/api/resumes/score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resumeLatex: resume.resume,
          jobDescription: jobDescriptionForScoring,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to score resume");
      }

      const data = await response.json();
      setScoringResult(data);
    } catch (err) {
      console.error("Error scoring resume:", err);
      setError(err instanceof Error ? err.message : "Failed to score resume");
    } finally {
      setScoringLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  // Pagination logic
  const totalPages = Math.ceil(resumes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentResumes = resumes.slice(startIndex, endIndex);

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
          Loading resumes...
        </div>
      </div>
    );
  }

  if (fetchError) {
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
          Error: {fetchError}
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
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
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
          My Resumes
        </h1>
        <button
          onClick={handleOpenModal}
          style={{
            background: "#4e5cff",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#3d4bff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#4e5cff";
          }}
        >
          + Create New Resume
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div
          style={{
            background: "#10b981",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {success}
        </div>
      )}

      {error && !isModalOpen && (
        <div
          style={{
            background: "#ef4444",
            color: "#fff",
            padding: "12px 20px",
            borderRadius: "8px",
            marginBottom: "1.5rem",
            fontSize: "14px",
            fontWeight: "500",
          }}
        >
          {error}
        </div>
      )}

      {/* Resume Table */}
      {resumes.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px",
            textAlign: "center",
            background: "#232124",
            borderRadius: "12px",
            border: "1px solid #444",
            padding: "3rem",
          }}
        >
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
              opacity: 0.5,
            }}
          >
            📄
          </div>
          <h3
            style={{
              color: "#fff",
              fontSize: "1.5rem",
              fontWeight: "600",
              margin: "0 0 1rem 0",
            }}
          >
            No resumes yet
          </h3>
          <p
            style={{
              color: "#b2c2c9",
              fontSize: "1rem",
              margin: "0 0 2rem 0",
              maxWidth: "400px",
              lineHeight: "1.5",
            }}
          >
            Create your first custom resume by clicking the button above.
          </p>
          <button
            onClick={handleOpenModal}
            style={{
              background: "#4e5cff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px 24px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#3d4bff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#4e5cff";
            }}
          >
            Create Your First Resume
          </button>
        </div>
      ) : (
        <div
          style={{
            background: "#232124",
            borderRadius: "12px",
            border: "1px solid #444",
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto auto auto auto",
              gap: "1rem",
              padding: "1rem 1.5rem",
              borderBottom: "1px solid #444",
              background: "#2a2a2a",
            }}
          >
            <div style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>
              Title
            </div>
            <div></div>
            <div style={{ color: "#fff", fontWeight: "600", fontSize: "14px" }}>
              Date
            </div>
            <div style={{ width: "120px" }}></div> {/* Actions column */}
          </div>

          {/* Table Rows */}
          {currentResumes.map((resume) => (
            <div
              key={resume._id}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto auto",
                gap: "1rem",
                padding: "1rem 1.5rem",
                borderBottom: "1px solid #333",
                alignItems: "center",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#2a2a2a";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              {/* Title */}
              <div>
                <div
                  style={{
                    color: "#fff",
                    fontWeight: "500",
                    fontSize: "14px",
                    marginBottom: "2px",
                  }}
                >
                  {resume.jobTitle} @ {resume.company}
                </div>
              </div>

              {/* Score Resume Button */}
              <div>
                <button
                  onClick={() => handleOpenScoringModal(resume._id)}
                  style={{
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontSize: "12px",
                    fontWeight: "500",
                    whiteSpace: "nowrap",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#ffc107";
                    e.currentTarget.style.color = "#ffc107";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#666";
                    e.currentTarget.style.color = "#fff";
                  }}
                  title="Score Resume"
                >
                  ⭐ Score
                </button>
              </div>

              {/* Date */}
              <div
                style={{
                  color: "#b2c2c9",
                  fontSize: "14px",
                }}
              >
                {formatDate(resume.createdAt)}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "flex-end",
                }}
              >
                {/* Edit Button */}
                <button
                  onClick={() => handleEditResume(resume._id)}
                  style={{
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "6px 8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#4e5cff";
                    e.currentTarget.style.color = "#4e5cff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#666";
                    e.currentTarget.style.color = "#fff";
                  }}
                  title="Edit Resume"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                {/* Download Button */}
                <button
                  onClick={() => handleDownloadResume(resume)}
                  style={{
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "6px",
                    color: "#fff",
                    padding: "6px 8px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#4eff9f";
                    e.currentTarget.style.color = "#4eff9f";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#666";
                    e.currentTarget.style.color = "#fff";
                  }}
                  title="Download PDF"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7,10 12,15 17,10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => handleDeleteResume(resume._id)}
                  disabled={deletingId === resume._id}
                  style={{
                    background: "transparent",
                    border: "1px solid #666",
                    borderRadius: "6px",
                    color: deletingId === resume._id ? "#666" : "#fff",
                    padding: "6px 8px",
                    cursor:
                      deletingId === resume._id ? "not-allowed" : "pointer",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    if (deletingId !== resume._id) {
                      e.currentTarget.style.borderColor = "#ff4444";
                      e.currentTarget.style.color = "#ff4444";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (deletingId !== resume._id) {
                      e.currentTarget.style.borderColor = "#666";
                      e.currentTarget.style.color = "#fff";
                    }
                  }}
                  title="Delete Resume"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="3,6 5,6 21,6"></polyline>
                    <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "8px",
            marginTop: "2rem",
          }}
        >
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              background: "transparent",
              border: "1px solid #666",
              borderRadius: "6px",
              color: currentPage === 1 ? "#666" : "#fff",
              padding: "8px 12px",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            ← Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (currentPage <= 3) {
              pageNum = i + 1;
            } else if (currentPage >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = currentPage - 2 + i;
            }

            return (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                style={{
                  background:
                    currentPage === pageNum ? "#4e5cff" : "transparent",
                  border: "1px solid #666",
                  borderRadius: "6px",
                  color: currentPage === pageNum ? "#fff" : "#b2c2c9",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                  minWidth: "40px",
                }}
              >
                {pageNum}
              </button>
            );
          })}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <span style={{ color: "#666", padding: "0 8px" }}>...</span>
          )}

          {totalPages > 5 && currentPage < totalPages - 2 && (
            <>
              <button
                onClick={() => setCurrentPage(totalPages - 1)}
                style={{
                  background: "transparent",
                  border: "1px solid #666",
                  borderRadius: "6px",
                  color: "#b2c2c9",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                {totalPages - 1}
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                style={{
                  background: "transparent",
                  border: "1px solid #666",
                  borderRadius: "6px",
                  color: "#b2c2c9",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            style={{
              background: "transparent",
              border: "1px solid #666",
              borderRadius: "6px",
              color: currentPage === totalPages ? "#666" : "#fff",
              padding: "8px 12px",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "14px",
            }}
          >
            Next →
          </button>
        </div>
      )}

      {/* Scoring Modal */}
      {scoringModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseScoringModal}
        >
          <div
            style={{
              background: "#232124",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "600px",
              width: "90%",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.5)",
              border: "1px solid #444",
            }}
            onClick={(e) => e.stopPropagation()}
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
                  color: "#fff",
                  fontSize: "1.5rem",
                  fontWeight: "600",
                  margin: 0,
                }}
              >
                Score Resume
              </h2>
              <button
                onClick={handleCloseScoringModal}
                disabled={scoringLoading}
                style={{
                  background: "none",
                  border: "none",
                  color: "#b2c2c9",
                  fontSize: "1.5rem",
                  cursor: scoringLoading ? "not-allowed" : "pointer",
                  padding: 0,
                  opacity: scoringLoading ? 0.5 : 1,
                }}
              >
                ✕
              </button>
            </div>

            {!scoringResult ? (
              <>
                <div style={{ marginBottom: "1.5rem" }}>
                  <label
                    style={{
                      display: "block",
                      color: "#fff",
                      fontSize: "14px",
                      fontWeight: "500",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Job Description
                  </label>
                  <textarea
                    value={jobDescriptionForScoring}
                    onChange={(e) =>
                      setJobDescriptionForScoring(e.target.value)
                    }
                    placeholder="Paste the job description here..."
                    disabled={scoringLoading}
                    style={{
                      width: "100%",
                      minHeight: "200px",
                      padding: "12px",
                      background: "#181718",
                      border: "1px solid #444",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "14px",
                      fontFamily: "inherit",
                      boxSizing: "border-box",
                      resize: "vertical",
                      opacity: scoringLoading ? 0.5 : 1,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={handleCloseScoringModal}
                    disabled={scoringLoading}
                    style={{
                      background: "transparent",
                      border: "1px solid #666",
                      borderRadius: "8px",
                      color: "#fff",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: scoringLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      opacity: scoringLoading ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!scoringLoading) {
                        e.currentTarget.style.borderColor = "#b2c2c9";
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#666";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitScoring}
                    disabled={scoringLoading}
                    style={{
                      background: scoringLoading ? "#ccaa00" : "#ffc107",
                      border: "none",
                      borderRadius: "8px",
                      color: "#000",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: scoringLoading ? "not-allowed" : "pointer",
                      transition: "all 0.2s",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onMouseEnter={(e) => {
                      if (!scoringLoading) {
                        e.currentTarget.style.background = "#ffb300";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#ffc107";
                    }}
                  >
                    {scoringLoading ? (
                      <>
                        <svg
                          style={{
                            animation: "spin 1s linear infinite",
                            width: "16px",
                            height: "16px",
                          }}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" />
                          <path d="M12 2a10 10 0 0 1 10 10" />
                        </svg>
                        Scoring...
                      </>
                    ) : (
                      "Score Resume"
                    )}
                  </button>
                </div>
              </>
            ) : (
              <>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}</style>

                <div style={{ marginBottom: "2rem" }}>
                  {/* Score Section */}
                  <div
                    style={{
                      background: "#181718",
                      borderRadius: "8px",
                      padding: "1.5rem",
                      marginBottom: "1.5rem",
                      border: "2px solid #ffc107",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#b2c2c9",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Overall Match Score
                    </div>
                    <div
                      style={{
                        fontSize: "3.5rem",
                        fontWeight: "700",
                        color: "#ffc107",
                      }}
                    >
                      {scoringResult.score}%
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#888",
                        marginTop: "0.5rem",
                      }}
                    >
                      Match to job description
                    </div>
                  </div>

                  {/* Pros Section */}
                  <div style={{ marginBottom: "1.5rem" }}>
                    <h3
                      style={{
                        color: "#4eff9f",
                        fontSize: "14px",
                        fontWeight: "600",
                        marginBottom: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>✓</span>
                      Strengths
                    </h3>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                        listStyle: "none",
                      }}
                    >
                      {scoringResult.pros.map((pro: string, idx: number) => (
                        <li
                          key={idx}
                          style={{
                            color: "#b2c2c9",
                            fontSize: "13px",
                            marginBottom: "0.5rem",
                            lineHeight: "1.5",
                            paddingLeft: "12px",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              color: "#4eff9f",
                              fontWeight: "bold",
                            }}
                          >
                            •
                          </span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Cons Section */}
                  <div>
                    <h3
                      style={{
                        color: "#ff6b6b",
                        fontSize: "14px",
                        fontWeight: "600",
                        marginBottom: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span style={{ fontSize: "18px" }}>!</span>
                      Areas for Improvement
                    </h3>
                    <ul
                      style={{
                        margin: 0,
                        paddingLeft: "20px",
                        listStyle: "none",
                      }}
                    >
                      {scoringResult.cons.map((con: string, idx: number) => (
                        <li
                          key={idx}
                          style={{
                            color: "#b2c2c9",
                            fontSize: "13px",
                            marginBottom: "0.5rem",
                            lineHeight: "1.5",
                            paddingLeft: "12px",
                            position: "relative",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              left: 0,
                              color: "#ff6b6b",
                              fontWeight: "bold",
                            }}
                          >
                            •
                          </span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => {
                      setScoringResult(null);
                      setJobDescriptionForScoring("");
                      // Clear cached result when scoring again
                      if (selectedResumeForScoring) {
                        try {
                          localStorage.removeItem(
                            `scoring_${selectedResumeForScoring}`
                          );
                        } catch (err) {
                          console.error(
                            "Error clearing cached scoring result:",
                            err
                          );
                        }
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "1px solid #666",
                      borderRadius: "8px",
                      color: "#fff",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: "500",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#b2c2c9";
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "#666";
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    Score Another
                  </button>
                  <button
                    onClick={handleCloseScoringModal}
                    style={{
                      background: "#4e5cff",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      padding: "10px 20px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#3d4bff";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#4e5cff";
                    }}
                  >
                    Done
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      <NewResumeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

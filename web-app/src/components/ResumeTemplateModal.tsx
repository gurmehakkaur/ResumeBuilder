"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  ResumeTemplate,
  resumeTemplates,
} from "@/lib/templates/resumeTemplates";

interface ResumeTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSelect: (template: ResumeTemplate) => void;
}

export default function ResumeTemplateModal({
  isOpen,
  onClose,
  onTemplateSelect,
}: ResumeTemplateModalProps) {
  const [selectedTemplate, setSelectedTemplate] =
    useState<ResumeTemplate | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fullScreenPreview, setFullScreenPreview] = useState<string | null>(
    null
  );

  // Add CSS animations to head
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes fadeOut {
        from {
          opacity: 1;
        }
        to {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (style.parentNode === document.head) {
        document.head.removeChild(style);
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleTemplateClick = (template: ResumeTemplate) => {
    setSelectedTemplate(template);
    setShowConfirmation(true);
  };

  const handleConfirm = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
      setShowConfirmation(false);

      // Show reminder notification
      const notification = document.createElement("div");
      notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background-color: #4361ee;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        font-size: 14px;
        max-width: 300px;
        animation: slideIn 0.3s ease-out;
      `;
      notification.textContent =
        "Don't forget to update the template as per your information";
      document.body.appendChild(notification);

      // Remove notification after 5 seconds
      const timeoutId = setTimeout(() => {
        notification.style.animation = "fadeOut 0.3s ease-out";
        const cleanupId = setTimeout(() => {
          if (notification.parentNode === document.body) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 5000);

      onClose();
    }
  };

  const handleCancel = () => {
    setSelectedTemplate(null);
    setShowConfirmation(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "#232124",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "900px",
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
          position: "relative",
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            background: "none",
            border: "none",
            color: "#f9f3e7",
            fontSize: "1.5rem",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <h2
          style={{
            color: "#f9f3e7",
            fontSize: "2rem",
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          Choose a Resume Template
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "2rem",
            marginBottom: "2rem",
          }}
        >
          {resumeTemplates.map((template) => (
            <div
              key={template.id}
              style={{
                backgroundColor: "#181718",
                borderRadius: "8px",
                padding: "1rem",
                cursor: "pointer",
                border: "1px solid rgba(67, 97, 238, 0.3)",
                transition: "transform 0.2s, border-color 0.2s",
              }}
              onClick={() => handleTemplateClick(template)}
            >
              {template.preview && (
                <div
                  style={{
                    marginBottom: "1rem",
                    position: "relative",
                    height: "250px",
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullScreenPreview(template.preview || null);
                  }}
                >
                  <Image
                    src={template.preview}
                    alt={`${template.name} preview`}
                    fill
                    style={{
                      objectFit: "contain",
                      borderRadius: "4px",
                    }}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "rgba(0,0,0,0.7)",
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    Click to preview
                  </div>
                </div>
              )}
              <h3
                style={{
                  color: "#f9f3e7",
                  fontSize: "1.2rem",
                  marginBottom: "0.5rem",
                }}
              >
                {template.name}
              </h3>
              <button
                style={{
                  backgroundColor: "#4361ee",
                  color: "#fff",
                  border: "none",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  width: "100%",
                  marginTop: "1rem",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTemplateClick(template);
                }}
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>

        {showConfirmation && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1001,
            }}
          >
            <div
              style={{
                backgroundColor: "#232124",
                padding: "2rem",
                borderRadius: "8px",
                maxWidth: "400px",
                width: "90%",
                textAlign: "center",
              }}
            >
              <h3
                style={{
                  color: "#f9f3e7",
                  fontSize: "1.5rem",
                  marginBottom: "1rem",
                }}
              >
                Warning
              </h3>
              <p
                style={{
                  color: "#f9f3e7",
                  marginBottom: "1rem",
                  lineHeight: "1.5",
                }}
              >
                &ldquo;Applying template&rdquo; replaces the user&apos;s master
                resume LaTeX with the selected template.
              </p>
              <p
                style={{
                  color: "#a0a0a0",
                  marginBottom: "2rem",
                  fontSize: "0.9rem",
                  lineHeight: "1.4",
                }}
              >
                You can still download or edit the updated master resume
                normally.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  justifyContent: "center",
                }}
              >
                <button
                  onClick={handleConfirm}
                  style={{
                    backgroundColor: "#4361ee",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Apply Template
                </button>
                <button
                  onClick={handleCancel}
                  style={{
                    backgroundColor: "#666",
                    color: "#fff",
                    border: "none",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {fullScreenPreview && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.95)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1002,
              cursor: "pointer",
            }}
            onClick={() => setFullScreenPreview(null)}
          >
            <div
              style={{
                position: "relative",
                width: "90vw",
                height: "90vh",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={fullScreenPreview}
                alt="Template preview"
                fill
                style={{
                  objectFit: "contain",
                }}
                quality={100}
                sizes="90vw"
              />
            </div>
            <button
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                background: "rgba(0,0,0,0.5)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
                padding: "10px 16px",
                zIndex: 1003,
              }}
              onClick={(e) => {
                e.stopPropagation();
                setFullScreenPreview(null);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

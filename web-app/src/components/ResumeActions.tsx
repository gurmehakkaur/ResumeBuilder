"use client";
import React from "react";
import { ResumeTemplate } from "@/lib/templates/resumeTemplates";
import ResumeTemplateModal from "./ResumeTemplateModal";

interface ResumeActionsProps {
  onEditClick: () => void;
  onDownloadPDF: () => void;
  onPreviewPDF: () => void;
  onDownloadMaster: () => void;
  onTemplateSelect: (template: ResumeTemplate) => void;
  onReplaceMaster: () => void;
  onSave: () => void;
  onCancel: () => void;
  showSaveButton: boolean;
}

export default function ResumeActions({
  onEditClick,
  onDownloadPDF,
  onPreviewPDF,
  onDownloadMaster,
  onTemplateSelect,
  onReplaceMaster,
  onSave,
  onCancel,
  showSaveButton,
}: ResumeActionsProps) {
  const [showTemplateModal, setShowTemplateModal] = React.useState(false);

  const handleTemplateSelect = (template: ResumeTemplate) => {
    onTemplateSelect(template);
    setShowTemplateModal(false);
  };

  return (
    <>
      <ResumeTemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onTemplateSelect={handleTemplateSelect}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "200px",
          alignItems: "stretch",
        }}
      >
        <button
          onClick={onEditClick}
          style={{
            background: "#5c4f6e",
            color: "#f9f3e7",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(92, 79, 110, 0.2)",
            width: "100%",
            textAlign: "center",
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
          Edit Master Resume
        </button>
        <button
          onClick={() => setShowTemplateModal(true)}
          style={{
            background: "#8d7ba3",
            color: "#f9f3e7",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(141, 123, 163, 0.2)",
            width: "100%",
            textAlign: "center",
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
          Change Template
        </button>
        <button
          onClick={onPreviewPDF}
          style={{
            background: "#d4c5b0",
            color: "#2a2a2a",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(212, 197, 176, 0.2)",
            width: "100%",
            textAlign: "center",
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
          Preview PDF
        </button>
        <button
          onClick={onDownloadPDF}
          style={{
            background: "#2a2a2a",
            color: "#f9f3e7",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(42, 42, 42, 0.2)",
            width: "100%",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(42, 42, 42, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(42, 42, 42, 0.2)";
          }}
        >
          Download PDF
        </button>
        <button
          onClick={onDownloadMaster}
          style={{
            background: "#7c6f8e",
            color: "#f9f3e7",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(124, 111, 142, 0.2)",
            width: "100%",
            textAlign: "center",
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
          Download LaTeX
        </button>
        <button
          onClick={onReplaceMaster}
          style={{
            background: "#3a3a3a",
            color: "#f9f3e7",
            border: "none",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            padding: "12px 24px",
            cursor: "pointer",
            transition: "all 0.2s ease",
            boxShadow: "0 2px 6px rgba(58, 58, 58, 0.2)",
            width: "100%",
            textAlign: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow =
              "0 4px 10px rgba(58, 58, 58, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 2px 6px rgba(58, 58, 58, 0.2)";
          }}
        >
          Replace Master Resume
        </button>
        {showSaveButton && (
          <>
            <button
              onClick={onSave}
              style={{
                background: "#7c6f8e",
                color: "#f9f3e7",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 24px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(124, 111, 142, 0.2)",
                width: "100%",
                textAlign: "center",
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
            <button
              onClick={onCancel}
              style={{
                background: "#3a3a3a",
                color: "#f9f3e7",
                border: "none",
                borderRadius: 12,
                fontWeight: 700,
                fontSize: 16,
                padding: "12px 24px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: "0 2px 6px rgba(58, 58, 58, 0.2)",
                width: "100%",
                textAlign: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 10px rgba(58, 58, 58, 0.25)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 6px rgba(58, 58, 58, 0.2)";
              }}
            >
              Cancel Changes
            </button>
          </>
        )}
      </div>
    </>
  );
}

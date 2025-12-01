"use client";

import { useState } from "react";

type UserData = {
  jobTitle?: string;
  // Add more fields here in the future
};

type EditableSettingsFormProps = {
  initialUserData: UserData;
};

export default function EditableSettingsForm({
  initialUserData,
}: EditableSettingsFormProps) {
  const [userData, setUserData] = useState<UserData>(initialUserData || {});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData({ ...userData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!userData.jobTitle || !userData.jobTitle.trim()) {
      setError("Job title is required");
      return;
    }

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobTitle: userData.jobTitle.trim(),
          // Add more fields here in the future
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Your settings have been updated successfully.");
      } else {
        setError(data.error || "Failed to update settings");
      }
    } catch {
      setError("Unable to connect to database. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
        Edit Your Profile
      </h2>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        {/* Job Title Field */}
        <div>
          <label
            htmlFor="jobTitle"
            style={{
              display: "block",
              fontSize: 16,
              fontWeight: 500,
              marginBottom: 8,
              color: "#b2c2c9",
            }}
          >
            Job Title:
          </label>
          <input
            type="text"
            id="jobTitle"
            name="jobTitle"
            value={userData.jobTitle || ""}
            onChange={handleChange}
            placeholder="e.g., Software Developer"
            style={{
              width: "100%",
              background: "#181718",
              color: "#fff",
              border: "none",
              borderBottom: "2px solid #2196f3",
              fontSize: 20,
              fontWeight: 700,
              padding: 8,
              outline: "none",
            }}
            disabled={loading}
          />
        </div>

        {/* Future fields can be added here */}

        {/* Save Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#2196f3",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "10px 28px",
            fontWeight: 700,
            fontSize: 18,
            cursor: "pointer",
            width: "fit-content",
            marginTop: 16,
          }}
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </form>

      {/* Messages */}
      {message && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "rgba(33, 150, 83, 0.1)",
            border: "1px solid #21B573",
            borderRadius: 4,
            color: "#21B573",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "rgba(255, 71, 71, 0.1)",
            border: "1px solid #FF4747",
            borderRadius: 4,
            color: "#FF4747",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

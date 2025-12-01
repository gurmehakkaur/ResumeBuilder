"use client";
import Image from "next/image";

export default function ExtensionPage() {
  return (
    <div
      style={{
        color: "#f9f3e7",
        padding: "2rem",
        width: "100%",
        margin: "0 auto",
        fontFamily: "sans-serif",
        flex: 1,
        overflow: "auto",
        backgroundColor: "#181718",
        minHeight: "100vh",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* The Header Section */}
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Image
            src="/no-bg-logo.png"
            alt="LazyMe Logo"
            width={80}
            height={80}
            style={{ marginBottom: "1.5rem" }}
          />
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              letterSpacing: "1px",
              color: "#f9f3e7",
              marginBottom: "1rem",
            }}
          >
            Browser Extension Setup
          </h1>
          <p
            style={{
              fontSize: "1.2rem",
              color: "#b2c2c9",
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: "1.6",
            }}
          >
            Follow these steps to install and start using the LazyMe extension
          </p>
        </div>

        {/* Download Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            1. Download and Extract
          </h2>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              alignItems: "center",
            }}
          >
            <a
              href="/extension.zip"
              download
              style={{
                background: "#4361ee",
                color: "#fff",
                padding: "1rem 2rem",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "1.1rem",
                fontWeight: "600",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "transform 0.2s ease",
                cursor: "pointer",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.transform = "scale(1.05)")
              }
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            >
              ⬇️ Download Extension
            </a>
            <ol
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                width: "100%",
                fontSize: "1.1rem",
                lineHeight: "1.6",
              }}
            >
              <li
                style={{
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <span style={{ color: "#4361ee", fontWeight: "bold" }}>1.</span>
                Locate{" "}
                <code
                  style={{
                    background: "#181718",
                    padding: "0.2rem 0.4rem",
                    borderRadius: "4px",
                    color: "#f9f3e7",
                  }}
                >
                  extension.zip
                </code>{" "}
                in your Downloads folder
              </li>
              <li
                style={{
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <span style={{ color: "#4361ee", fontWeight: "bold" }}>2.</span>
                Right-click and select &quot;Extract All...&quot;
              </li>
              <li
                style={{
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <span style={{ color: "#4361ee", fontWeight: "bold" }}>3.</span>
                Choose an extraction location (remember it!)
              </li>
              <li
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <span style={{ color: "#4361ee", fontWeight: "bold" }}>4.</span>
                Click &quot;Extract&quot; to finish
              </li>
            </ol>
          </div>
        </div>

        {/* Chrome Setup Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            2. Open Chrome Extensions
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "1.1rem",
              lineHeight: "1.6",
            }}
          >
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>1.</span>
              Open Google Chrome
            </li>
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>2.</span>
              Type{" "}
              <code
                style={{
                  background: "#181718",
                  padding: "0.2rem 0.4rem",
                  borderRadius: "4px",
                  color: "#f9f3e7",
                }}
              >
                chrome://extensions
              </code>{" "}
              in the address bar
            </li>
            <li
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>3.</span>
              Press Enter
            </li>
          </ol>
        </div>

        {/* Developer Mode Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            3. Enable Developer Mode
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "1.1rem",
              lineHeight: "1.6",
            }}
          >
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>1.</span>
              Find &quot;Developer mode&quot; in the top-right corner
            </li>
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>2.</span>
              Click the toggle switch to enable it
            </li>
            <li
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>3.</span>
              The switch should turn blue when enabled
            </li>
          </ol>
        </div>

        {/* Load Extension Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            4. Load the Extension
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "1.1rem",
              lineHeight: "1.6",
            }}
          >
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>1.</span>
              Click &quot;Load unpacked&quot; in the top-left
            </li>
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>2.</span>
              Navigate to your extracted extension folder
            </li>
            <li
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>3.</span>
              Select the folder and click &quot;Select Folder&quot;
            </li>
          </ol>
        </div>

        {/* Verification Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            5. Verify & Pin Extension
          </h2>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              fontSize: "1.1rem",
              lineHeight: "1.6",
            }}
          >
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>1.</span>
              Look for the puzzle piece icon in Chrome&apos;s toolbar
            </li>
            <li
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>2.</span>
              Find the LazyMe extension in the dropdown
            </li>
            <li
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <span style={{ color: "#4361ee", fontWeight: "bold" }}>3.</span>
              Click the pin icon to keep it visible
            </li>
          </ol>
        </div>

        {/* Troubleshooting Section */}
        <div
          style={{
            background: "#232124",
            padding: "2rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            border: "1px solid rgba(67, 97, 238, 0.3)",
          }}
        >
          <h2
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              color: "#4361ee",
              marginBottom: "1.5rem",
            }}
          >
            Troubleshooting
          </h2>
          <div style={{ fontSize: "1.1rem", lineHeight: "1.6" }}>
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee" }}>•</span>
              <strong>Can&apos;t find &quot;Load unpacked&quot;?</strong> Make
              sure Developer mode is enabled
            </div>
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee" }}>•</span>
              <strong>Getting errors?</strong> Select the extracted folder, not
              the zip file
            </div>
            <div
              style={{
                marginBottom: "1rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "1rem",
              }}
            >
              <span style={{ color: "#4361ee" }}>•</span>
              <strong>Extension not visible?</strong> Click the puzzle piece to
              find and pin it
            </div>
            <div
              style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}
            >
              <span style={{ color: "#4361ee" }}>•</span>
              <strong>Nothing happens on click?</strong> Try refreshing the page
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

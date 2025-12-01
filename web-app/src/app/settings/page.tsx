import { auth0 } from "@/lib/auth";
import connectMongoDB from "@/lib/mongodb";
import User from "@/models/User";
import { FiUser } from "react-icons/fi";
import EditableSettingsForm from "@/components/EditableSettingsForm";

export default async function Settings() {
  // Get user info from Auth0 session
  const session = await auth0.getSession();

  if (!session || !session.user) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#181718",
          color: "#fff",
        }}
      >
        <h1>You must be logged in to access this page</h1>
      </div>
    );
  }

  // Get user data from the database to get job title
  let userData = null;
  try {
    await connectMongoDB();
    userData = await User.findOne({ email: session.user.email });
  } catch (error) {
    console.error("Error fetching user data:", error);
  }

  const userInfo = {
    name: session.user.name || "Unknown",
    email: session.user.email || "Unknown Email",
    jobTitle: userData?.jobTitle || "",
  };

  return (
    <div
      style={{
        background: "#181718",
        minHeight: "100vh",
        color: "#fff",
        padding: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 8,
        }}
      >
        <h1 style={{ fontSize: 38, fontWeight: 800, margin: 0 }}>My Account</h1>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(33, 150, 243, 0.1)",
            borderRadius: 50,
            padding: "6px 12px",
          }}
        >
          <FiUser style={{ marginRight: 8 }} />
          <span>Authenticated User</span>
        </div>
      </div>
      <div style={{ height: 3, background: "#2196f3", marginBottom: 32 }} />

      {/* User Information Section - Non-editable */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          User Information
        </h2>
        <p style={{ color: "#b2c2c9", fontSize: 14, marginBottom: 20 }}>
          This information comes from your authentication provider and cannot be
          edited.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 32 }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <InfoField label="Name" value={userInfo.name} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <InfoField label="Email" value={userInfo.email} />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: "#333", margin: "32px 0" }} />

      {/* Editable Settings Form */}
      <EditableSettingsForm initialUserData={{ jobTitle: userInfo.jobTitle }} />
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          width: "100%",
          borderBottom: "2px solid #2196f3",
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 2,
          padding: 2,
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: "#b2c2c9",
          fontWeight: 500,
          fontSize: 15,
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

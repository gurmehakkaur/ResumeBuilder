import { auth0 } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";

export default async function LandingPage() {
  const session = await auth0.getSession();
  
  // If the user is authenticated, redirect them to the dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        background: "#181718",
        color: "#f9f3e7",
        fontFamily: "sans-serif",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <Image
        src="/no-bg-logo.png"
        alt="LazyMe Logo"
        width={100}
        height={100}
        style={{ marginBottom: "2rem" }}
      />
      <h1
        style={{
          fontSize: "3.5rem",
          fontWeight: 900,
          letterSpacing: "1px",
          marginBottom: "1rem",
        }}
      >
        Welcome to <span style={{ color: "#4361ee" }}>LazyMe</span>
      </h1>
      <p
        style={{
          fontSize: "1.2rem",
          maxWidth: "600px",
          lineHeight: "1.6",
          marginBottom: "2rem",
        }}
      >
        Create a master resume and let our AI-powered browser extension tailor
        it for any job posting on platforms like LinkedIn, ensuring you always
        put your best foot forward.
      </p>
      <a
        href="/auth/login"
        style={{
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          fontWeight: "bold",
          color: "#fff",
          background: "#4361ee",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          transition: "background 0.3s",
        }}
      >
        Get Started
      </a>
    </main>
  );
}


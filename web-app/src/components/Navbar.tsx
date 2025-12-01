"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { FiSettings } from "react-icons/fi";
import Image from "next/image";

function SidebarLink({
  label,
  href,
  active = false,
}: {
  label: React.ReactNode;
  href: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: "none",
        marginLeft: 32,
        marginBottom: 8,
        fontWeight: 700,
        color: active ? "#b2c2c9" : "#f9f3e7",
        fontSize: 16,
        cursor: "pointer",
        transition: "color 0.2s",
        borderLeft: active ? "4px solid #b2c2c9" : "4px solid transparent",
        paddingLeft: 12,
        background: active ? "rgba(178,194,201,0.07)" : "none",
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {label}
    </Link>
  );
}

// Auth0 user has properties like name, email, etc.
type Auth0User = {
  name?: string;
  email?: string;
  nickname?: string;
  picture?: string;
  sub?: string;
  [key: string]: unknown;
};

export default function Navbar({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: Auth0User;
}) {
  const pathname = usePathname();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch: only render UI on client
  if (pathname.startsWith("/login") || pathname === "/") {
    return <>{children}</>;
  }

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        backgroundColor: "#181718",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <nav
        style={{
          width: 220,
          background: "#232124",
          borderTopRightRadius: 32,
          borderBottomRightRadius: 32,
          boxShadow: "2px 0 16px #0002",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "36px 0 0 0",
          gap: 10,
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          zIndex: 100,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: 32,
            marginBottom: 40,
          }}
        >
          <span
            style={{
              fontWeight: 900,
              fontSize: 26,
              color: "#fff",
              letterSpacing: 1,
            }}
          >
            Lazy Me
          </span>
        </div>
        <SidebarLink
          label="Dashboard"
          href="/dashboard"
          active={pathname === "/dashboard"}
        />
        <SidebarLink
          label="My Resumes"
          href="/resumes"
          active={pathname === "/resumes"}
        />
        <SidebarLink
          label="Extension"
          href="/extension"
          active={pathname === "/extension"}
        />
        <div style={{ flex: 1 }} />
        <SidebarLink
          label={
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 800,
                fontSize: 18,
                color: "#ffe0b2",
              }}
            >
              <FiSettings size={22} />
              Settings
            </span>
          }
          href="/settings"
          active={pathname === "/settings"}
        />
        <div
          style={{ margin: "0 0 32px 32px", color: "#b2c2c9", fontSize: 13 }}
        >
          © 2025 Lazy Me
        </div>
      </nav>
      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          background: "#f9f3e7",
          borderTopLeftRadius: 32,
          borderBottomLeftRadius: 32,
          boxShadow: "-2px 0 16px #0001",
          marginLeft: 220,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "18px 36px 10px 0",
            gap: 20,
            minHeight: 36,
          }}
        >
          <span
            style={{
              fontWeight: 700,
              color: "#222",
              fontSize: 17,
              letterSpacing: 0.5,
              marginRight: 6,
            }}
          >
            {user?.name || user?.nickname || "Guest"}
          </span>
          <a
            href="/auth/logout"
            style={{
              background: "none",
              border: "none",
              color: "#ff2d2d",
              fontWeight: 700,
              fontSize: 15,
              cursor: "pointer",
              marginRight: 6,
            }}
          >
            Logout
          </a>
          <div
            style={{
              background: "#232124",
              borderRadius: "50%",
              padding: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 8px #0006",
            }}
          >
            {user?.picture ? (
              <Image
                src={user.picture}
                alt="User Profile"
                width={40}
                height={40}
                style={{ borderRadius: "50%" }}
              />
            ) : (
              <Image
                src="/no-bg-logo.png"
                alt="Logo"
                width={40}
                height={40}
                style={{ opacity: 0.85 }}
              />
            )}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

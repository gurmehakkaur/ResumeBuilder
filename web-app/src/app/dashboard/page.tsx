import { auth0 } from "@/lib/auth";
import { redirect } from "next/navigation";
import MasterResume from "@/components/MasterResume";
import { ensureUserExists } from "@/lib/ensureUserExists";

export default async function Dashboard() {
  // Redirect if not authenticated
  const session = await auth0.getSession();
  const authUser = session?.user;

  // If there is no user session, redirect to the login page
  if (!authUser) {
    redirect("/auth/login");
  }

  // Ensure user exists in our database
  await ensureUserExists(authUser); // We don't need to use the return value right now

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
      <MasterResume />
    </div>
  );
}

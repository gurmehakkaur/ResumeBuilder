import LandingPage from "./landing/page";
import { auth0 } from "@/lib/auth";
import { redirect } from "next/navigation";
import MongoTest from "@/components/MongoTest";
import JobTitleForm from "@/components/JobTitleForm";

export default async function Home() {
  const session = await auth0.getSession();

  // If the user is authenticated, redirect them to the dashboard
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <>
      <LandingPage />
      <MongoTest></MongoTest>
      <JobTitleForm></JobTitleForm>
    </>
  );
}

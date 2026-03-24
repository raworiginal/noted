import LoginForm from "@/components/LoginForm";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (session) redirect("/dashboard");
  return (
    <>
      <div className="hero bg-base-100 min-h-screen">
        <LoginForm />
      </div>
    </>
  );
}

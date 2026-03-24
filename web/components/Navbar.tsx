import { auth } from "@/lib/auth";
import LogoutBtn from "./LogoutBtn";
import { headers } from "next/headers";
export default async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="navbar bg-accent shadow-md">
      <div className="navbar-start"></div>
      <div className="navbar-center">
        <p className="color-accent-content text-xl font-bold">NOTED</p>
      </div>
      <div className="navbar-end">{session && <LogoutBtn />}</div>
    </nav>
  );
}

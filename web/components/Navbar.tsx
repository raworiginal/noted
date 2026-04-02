import { auth } from "@/lib/auth";
import LogoutBtn from "./LogoutBtn";
import { headers } from "next/headers";
import Link from "next/link";
export default async function Navbar() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <nav className="navbar shadow-md">
      <div className="navbar-start"></div>
      <div className="navbar-center">
        <Link
          href={"/dashboard"}
          className="color-accent-content text-xl font-bold"
        >
          NOTED
        </Link>
      </div>
      <div className="navbar-end">{session && <LogoutBtn />}</div>
    </nav>
  );
}

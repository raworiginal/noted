"use client";
import { signOut } from "@/actions/authActions";
export default function LogoutBtn() {
  return (
    <button className="btn btn-secondary" onClick={signOut}>
      Logout
    </button>
  );
}

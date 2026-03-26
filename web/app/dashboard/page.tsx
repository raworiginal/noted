import NoteForm from "@/components/NoteForm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export default async function Dashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return "Hey! you're not supposed to be here";
  }
  return (
    <>
      hello, {session.user.username}
      <NoteForm />
    </>
  );
}

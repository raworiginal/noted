"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth";
import { SignUpData, SignInData } from "@/types/userTypes";

const signUp = async (body: SignUpData) => {
  try {
    await auth.api.signUpEmail({ body });
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, message: error.message || "Sign up failed" };
    }
    console.error(error);
  }
  redirect("/dashboard");
};

const signIn = async (body: SignInData) => {
  try {
    await auth.api.signInUsername({ body });
  } catch (error) {
    if (error instanceof APIError) {
      return { success: false, message: error.message || "Sign up failed" };
    }
    console.error(error);
  }
  redirect("/dashboard");
};

const signOut = async () => {
  await auth.api.signOut({
    headers: await headers(),
  });
  redirect("/");
};

export { signIn, signUp, signOut };

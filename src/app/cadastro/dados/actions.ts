"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const profileType = formData.get("profile_type") as string;
  const experienceLevel = formData.get("experience_level") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, profile_type: profileType, experience_level: experienceLevel },
    },
  });

  if (error) {
    redirect(`/cadastro/dados?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/cadastro/documento");
}

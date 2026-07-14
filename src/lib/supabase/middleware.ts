import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  // Identifica o aparelho (cookie de longa duração) — usado pra marcar
  // leitura de mensagem por aparelho, não por conta (perfil casal usa o
  // mesmo login em dois celulares diferentes).
  if (!request.cookies.get("lumeo_device_id")) {
    response.cookies.set("lumeo_device_id", crypto.randomUUID(), {
      maxAge: 60 * 60 * 24 * 365 * 5,
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}

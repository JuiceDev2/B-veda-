import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Faltan variables de entorno de Supabase. Revisa tu .env.local");
  }

  const cookieStore = cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      async get(name: string) {
        return (await cookieStore).get(name)?.value;
      },
      async set(name: string, value: string, options: any) {
        (await cookieStore).set({ name, value, ...options });
      },
      async remove(name: string, options: any) {
        (await cookieStore).set({ name, value: "", ...options });
      },
    },
  });
}
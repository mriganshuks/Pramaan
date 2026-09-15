import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !publishableKey) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(url, publishableKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options });
        } catch {
          // Can happen in Server Components where cookies cannot be set directly
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: "", ...options, maxAge: 0 });
        } catch {
          // Can happen in Server Components
        }
      },
    },
  });
}

export async function getSupabaseUserFromRequest(request?: Request) {
  // 1. Check Bearer token in Authorization header if present
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const publishableKey =
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (url && publishableKey && token) {
        const client = createServerClient(url, publishableKey, {
          cookies: {
            get: () => undefined,
            set: () => {},
            remove: () => {},
          },
        });
        const { data, error } = await client.auth.getUser(token);
        if (!error && data?.user) {
          return data.user;
        }
      }
    }
  }

  // 2. Check cookies
  const client = await getSupabaseServerClient();
  if (!client) return null;

  try {
    const { data: { user }, error } = await client.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}

import { createBrowserClient } from "@supabase/ssr";
import { parse, serialize } from "cookie";
import { REMEMBER_COOKIE, applyRemember, prefersPersistentSession } from "@/lib/auth/remember";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Custom cookie accessors so a "don't remember me" session stays a session cookie
// when the browser client refreshes the token. The default writer always sets a
// 400-day maxAge (Tech.md §5.1).
export const createClient = () =>
  createBrowserClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        if (typeof document === "undefined") return [];
        const parsed = parse(document.cookie);
        return Object.keys(parsed).map((name) => ({ name, value: parsed[name] ?? "" }));
      },
      setAll(cookiesToSet) {
        if (typeof document === "undefined") {
          throw new Error("The browser auth client cannot set cookies during server rendering.");
        }
        const remember = prefersPersistentSession(parse(document.cookie)[REMEMBER_COOKIE]);
        cookiesToSet.forEach(({ name, value, options }) => {
          document.cookie = serialize(name, value, applyRemember(options, remember));
        });
      },
    },
  });

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL;

export const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseJwksUrl =
  process.env.SUPABASE_JWKS_URL ||
  (supabaseUrl ? `${supabaseUrl}/auth/v1/.well-known/jwks.json` : undefined);

export const isSupabaseConfigured = Boolean(
  supabaseUrl && (supabasePublishableKey || supabaseSecretKey)
);

/**
 * Standard client instance (uses secret/service-role key on server if available, publishable/anon key otherwise)
 */
const effectiveKey =
  typeof window === "undefined"
    ? (supabaseSecretKey || supabasePublishableKey)
    : (supabasePublishableKey || supabaseSecretKey);

export const supabase: SupabaseClient<Database> | null =
  isSupabaseConfigured && effectiveKey
    ? createClient<Database>(supabaseUrl!, effectiveKey, {
        auth: {
          persistSession: typeof window !== "undefined",
          autoRefreshToken: typeof window !== "undefined",
        },
      })
    : null;

/**
 * Admin client instance (uses Secret Key for elevated/backend tasks)
 */
export const supabaseAdmin: SupabaseClient<Database> | null =
  supabaseUrl && (supabaseSecretKey || supabasePublishableKey)
    ? createClient<Database>(supabaseUrl, (supabaseSecretKey || supabasePublishableKey)!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : supabase;

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error(
      "Supabase client is not initialized. Please set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY (or SUPABASE_SECRET_KEY)."
    );
  }
  return supabase;
}

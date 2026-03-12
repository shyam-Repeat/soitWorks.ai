import "../env.js";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error("SUPABASE_URL is not set in environment variables.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set in environment variables.");
}

const clientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
};

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  clientOptions,
);

const supabaseAuth: SupabaseClient = SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, clientOptions)
  : supabaseAdmin;

const mapUser = (user: User) => ({
  id: user.id,
  email: user.email ?? "",
  name: (user.user_metadata as any)?.name ?? "",
});

export async function registerUser(email: string, password: string, name: string) {
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });

  if (createError) {
    throw new Error(createError.message);
  }

  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(error?.message || "Registration login failed");
  }

  return {
    user: mapUser(data.user),
    token: data.session.access_token,
  };
}

export async function loginUser(email: string, password: string) {
  const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session) {
    throw new Error(error?.message || "Login failed");
  }

  return {
    user: mapUser(data.user),
    token: data.session.access_token,
  };
}

export async function validateToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }
  return mapUser(data.user);
}

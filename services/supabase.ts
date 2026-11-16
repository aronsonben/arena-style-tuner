import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Vite's dev server serves plain HTTP, not HTTPS, so the redirect must match in DEV mode.
const emailRedirectTo = import.meta.env.DEV ? 'http://localhost:3000' : 'https://arena.concourse.codes';
const resetPasswordRedirectTo = import.meta.env.DEV ? 'http://localhost:3000/reset-password' : 'https://arena.concourse.codes/reset-password';

export async function signUpNewUser(email: string, password: string) {
  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo },
  });
}

export async function signInExistingUser(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOutUser() {
  return supabase.auth.signOut();
}

// Sends a recovery email whose link signs the user into a short-lived recovery
// session; the dedicated /reset-password page detects this via onAuthStateChange's PASSWORD_RECOVERY event.
export async function requestPasswordReset(email: string) {
  return supabase.auth.resetPasswordForEmail(email, { redirectTo: resetPasswordRedirectTo });
}

export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({ password: newPassword });
}
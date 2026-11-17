import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Vite's dev server serves plain HTTP, not HTTPS, so the redirect must match in DEV mode.
const emailRedirectTo = import.meta.env.DEV ? 'http://localhost:3000' : 'https://arena.concourse.codes';
const resetPasswordRedirectTo = import.meta.env.DEV ? 'http://localhost:3000/reset-password' : 'https://arena.concourse.codes/reset-password';


/* –– AUTH FUNCTIONS ––––––––––––––––––––––––––––––––––––––––––––––––––––––– */

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

/* –– BYOK FUNCTIONS ––––––––––––––––––––––––––––––––––––––––––––––––––––––– */
/** Save a users passed-in API key using a custom function that utilizes Supabase Vault's encryption method.
 * See Supabase dashboard for more.
 */
export async function saveGeminiKey(apiKey: string) {
  return supabase.rpc('set_user_llm_key', { p_api_key: apiKey });
}

export async function updateGeminiKey(apiKey: string) {
  // implement update key RPC function
}

/** Delete a user's stored API key using a secure RPC supabase function to remove from Supabase Vault's secure, encrypted storage */
export async function deleteGeminiKey() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Must be logged in.');
  return supabase.rpc('delete_user_llm_key');
}

export async function hasGeminiKey(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from('user_llm_keys').select('user_id').maybeSingle();
  return !!data;
}
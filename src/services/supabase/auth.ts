import { supabase } from './supabaseClient';

export async function signUpWithEmail(email: string, password: string) {
  return supabase.auth.signUp({ email, password });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

export async function deleteAccount() {
  // Supabase does not allow deleting the user from the client SDK for security reasons.
  // You must use a Supabase Edge Function or call the admin API from a secure backend.
  // Here, we return an error message as a placeholder.
  return { error: { message: 'Account deletion must be handled by a secure backend or Supabase Edge Function.' } };
}

export async function resendConfirmationEmail(email: string) {
  return supabase.auth.resend({ type: 'signup', email });
} 
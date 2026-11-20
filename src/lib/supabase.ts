import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../types/quiz';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

export async function signInWithSupabaseEmail(
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Supabase ulanmagan' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) {
    return { user: null, error: 'Topilmadi' };
  }
  const metaName =
    (data.user.user_metadata?.full_name as string | undefined) ||
    (data.user.user_metadata?.name as string | undefined) ||
    data.user.email?.split('@')[0] ||
    'Foydalanuvchi';
  return {
    user: {
      id: data.user.id,
      name: metaName,
      email: data.user.email || email,
      provider: 'email',
    },
    error: null,
  };
}

export async function signUpWithSupabaseEmail(
  name: string,
  email: string,
  password: string
): Promise<{ user: User | null; error: string | null }> {
  if (!supabase) {
    return { user: null, error: 'Supabase ulanmagan' };
  }
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: {
        full_name: name.trim(),
      },
    },
  });
  if (error || !data.user) {
    return { user: null, error: error?.message || "Ro'yxatdan o'tishda xatolik" };
  }
  return {
    user: {
      id: data.user.id,
      name: name.trim(),
      email: data.user.email || email,
      provider: 'email',
    },
    error: null,
  };
}

export async function signInWithSupabaseGoogle(): Promise<{ error: string | null }> {
  if (!supabase) {
    return { error: 'SUPABASE_NOT_CONFIGURED' };
  }
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    },
  });
  if (error) {
    return { error: error.message };
  }
  return { error: null };
}

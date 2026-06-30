/**
 * KPSS Aşkı - Auth Servisi
 * v8: Tip güvenli, anonim auth
 */

import { supabase } from './supabaseClient';
import type { ProfilesRow } from '../types/database';

export interface SignUpResult {
  user: { id: string };
  session: any;
  reactivated: boolean;
  previousStats?: {
    total_study_seconds: number;
    weekly_study_seconds: number;
  };
}

// Promise timeout helper
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), ms)
  );
  return Promise.race([promise, timeout]);
}

// Kullanıcı adı ile kayıt (anon auth)
export async function signUpWithUsername(username: string): Promise<SignUpResult> {
  const trimmed = username.trim().toLowerCase();

  // Mevcut profili kontrol et (aktif/pasif fark etmez)
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', trimmed)
    .single();

  // Anonim oturum oluştur
  const { data: authData, error: authError } = await supabase.auth.signInAnonymously();

  if (authError) throw authError;
  if (!authData.user) throw new Error('Oturum oluşturulamadı');

  if (existingProfile) {
    // Eğer profil aktifse hata ver
    if (existingProfile?.is_active) {
      await supabase.auth.signOut();
      throw new Error('Bu kullanıcı adı zaten alınmış!');
    }

    // Pasif profili reaktive et
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'reactivate_profile',
      {
        p_old_profile_id: existingProfile.id,
        p_new_auth_id: authData.user.id,
        p_username: trimmed,
      }
    );

    if (rpcError) {
      await supabase.auth.signOut();
      throw rpcError;
    }

    if (!rpcResult.success) {
      await supabase.auth.signOut();
      throw new Error((rpcResult as any)?.error || 'Profil reaktive edilemedi');
    }

    return {
      user: { id: authData.user.id },
      session: authData.session,
      reactivated: true,
      previousStats: {
        total_study_seconds: (rpcResult as any)?.total_study_seconds || 0,
        weekly_study_seconds: (rpcResult as any)?.weekly_study_seconds || 0,
      },
    };
  }

  // Yeni profil oluştur
  const { error: profileError } = await supabase.from('profiles').insert({
    id: authData.user.id,
    username: trimmed,
  });

  if (profileError) {
    await supabase.auth.signOut();
    throw profileError;
  }

  return {
    user: { id: authData.user.id },
    session: authData.session,
    reactivated: false,
  };
}

// Otomatik giriş (token varsa)
export async function autoLogin(): Promise<{
  user: { id: string };
  profile: ProfilesRow | null;
} | null> {
  try {
    const sessionResult: any = await withTimeout(supabase.auth.getSession(), 8000);
    const session = sessionResult?.data?.session ?? null;

    if (!session) return null;

    const profileResult: any = await withTimeout(
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single(),
      8000
    );

    return {
      user: { id: session.user.id },
      profile: profileResult?.data ?? null,
    };
  } catch {
    return null;
  }
}

// Kullanıcı profilini getir
export async function getProfile(userId: string): Promise<ProfilesRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// Çıkış yap
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * KPSS Aşkı - Profil Servisi
 * v8: Tip güvenli
 */

import { supabase } from './supabaseClient';
import type { ProfilesRow } from '../types/database';

// Profili ID'ye göre getir
export async function getProfileById(userId: string): Promise<ProfilesRow | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// Aktif durumunu güncelle
export async function setActiveStatus(
  userId: string,
  isActive: boolean
): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      is_active: isActive,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// Online presence (periyodik)
export async function updatePresence(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      is_active: true,
      last_active_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// Çıkış öncesi profili pasif yap
export async function deactivateProfile(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({
      is_active: false,
      current_room_id: null,
      last_active_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

/**
 * KPSS Aşkı - Realtime Subscription Yöneticisi
 * v8: Memory leak fix (ERR-002)
 *
 * Tüm Supabase realtime channel'larını merkezi olarak yönetir.
 * Her subscribe çağrısında önce aynı channel varsa unsubscribe eder,
 * böylece duplicate subscription ve memory leak önlenir.
 */

import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

type ChannelConfig = {
  table: string;
  schema?: string;
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  filter?: string;
};

class RealtimeManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  /**
   * Bir Supabase channel'ına abone ol.
   * Aynı key ile daha önce abone olunmuşsa, önce eski aboneliği kaldırır.
   *
   * @param key Benzersiz channel anahtarı (örn: "leaderboard-room-456")
   * @param config Channel yapılandırması
   * @param callback Değişiklik olduğunda çağrılacak fonksiyon
   * @returns Cleanup fonksiyonu
   */
  subscribe(
    key: string,
    config: ChannelConfig,
    callback: () => void
  ): () => void {
    // Önce aynı key varsa temizle
    this.unsubscribe(key);

    const channel = supabase
      .channel(key)
      .on(
        'postgres_changes' as any,
        {
          event: config.event || '*',
          schema: config.schema || 'public',
          table: config.table,
          ...(config.filter ? { filter: config.filter } : {}),
        },
        () => {
          callback();
        }
      )
      .subscribe();

    this.channels.set(key, channel);

    // Cleanup fonksiyonu döndür
    return () => {
      this.unsubscribe(key);
    };
  }

  /**
   * Belirli bir channel aboneliğini kaldır.
   */
  unsubscribe(key: string): void {
    const existing = this.channels.get(key);
    if (existing) {
      supabase.removeChannel(existing);
      this.channels.delete(key);
    }
  }

  /**
   * Tüm abonelikleri temizle.
   */
  unsubscribeAll(): void {
    for (const [key] of this.channels) {
      this.unsubscribe(key);
    }
  }

  /**
   * Belirli bir key için abonelik var mı?
   */
  isSubscribed(key: string): boolean {
    return this.channels.has(key);
  }
}

// Singleton export
export const realtimeManager = new RealtimeManager();

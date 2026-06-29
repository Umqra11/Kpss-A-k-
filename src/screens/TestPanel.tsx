/**
 * KPSS Aşkı - Test Paneli
 * Gizli test sayfası - sadece /test URL ile erişilir
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Alert,
    TextInput,
} from 'react-native';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { useTimerStore } from '../stores/timerStore';
import { useAuthStore } from '../stores/authStore';
import { useLeaderboardStore } from '../stores/leaderboardStore';
import { supabase, getCurrentWeekStart } from '../services/supabase';
import { formatDurationCompact, formatWithDays, MILESTONES } from '../theme/milestones';

export function TestPanel() {
    const [testUsername, setTestUsername] = useState('test_kullanici');
    const [dbStats, setDbStats] = useState<{ profiles: number; sessions: number } | null>(null);
    const [log, setLog] = useState<string[]>([]);

    const timerStore = useTimerStore();
    const authStore = useAuthStore();
    const leaderboardStore = useLeaderboardStore();

    const addLog = (msg: string) => {
        setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
    };

    // Timer hızlandırma
    const addMinutes = (minutes: number) => {
        if (timerStore.status === 'idle') {
            timerStore.startTimer();
            addLog(`Timer başlatıldı`);
        }

        const msToAdd = minutes * 60 * 1000;
        const currentStartTime = timerStore.startTime || Date.now();
        timerStore.startTime = currentStartTime - msToAdd;

        timerStore.computeStudyStats();
        addLog(`⏱️ ${minutes} dakika eklendi (toplam: ${formatDurationCompact(Math.floor(timerStore.getElapsedMs() / 1000))})`);
    };

    const addHours = (hours: number) => {
        addMinutes(hours * 60);
    };

    // Popup tetikle
    const triggerPopup = (hours: number) => {
        const milestone = MILESTONES.find((m) => m.hours === hours);
        if (milestone) {
            timerStore.lastMilestonePopup = {
                icon: milestone.icon,
                title: milestone.title,
                message: milestone.message,
            };
            addLog(`🎉 Popup tetiklendi: ${milestone.icon} ${milestone.title}`);
        }
    };

    // Kullanıcı değiştir
    const switchUser = async () => {
        await authStore.logout();
        await authStore.register(testUsername);
        addLog(`👤 Kullanıcı değiştirildi: @${testUsername}`);
    };

    // DB Durumu
    const checkDbStatus = async () => {
        try {
            const { data: profiles } = await supabase.from('profiles').select('id', { count: 'exact', head: true });
            const { data: sessions } = await supabase.from('study_sessions').select('id', { count: 'exact', head: true });

            setDbStats({
                profiles: (profiles as any)?.count || 0,
                sessions: (sessions as any)?.count || 0,
            });
            addLog(`📊 DB: ${(profiles as any)?.count || 0} profil, ${(sessions as any)?.count || 0} oturum`);
        } catch (err: any) {
            addLog(`❌ DB hatası: ${err.message}`);
        }
    };

    // Haftalık sıfırla
    const resetWeekly = async () => {
        try {
            await supabase.rpc('reset_weekly_study_times');
            addLog('🔄 Haftalık süreler sıfırlandı!');
            await leaderboardStore.fetchLeaderboard();
        } catch (err: any) {
            addLog(`❌ Sıfırlama hatası: ${err.message}`);
        }
    };

    // Leaderboard yenile
    const refreshLeaderboard = async () => {
        await leaderboardStore.fetchLeaderboard();
        addLog(`📊 Leaderboard yenilendi (${leaderboardStore.weeklyEntries.length} kişi)`);
    };

    // Pause
    const handlePause = async () => {
        await timerStore.pauseTimer();
        addLog('⏸ Kronometre duraklatıldı');
    };

    // Reset
    const handleReset = async () => {
        await timerStore.resetTimer();
        addLog('🔄 Kronometre sıfırlandı');
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
                <Text style={styles.title}>🧪 Test Paneli</Text>

                {/* Timer Kontrolleri */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⏱️ Timer Kontrol</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btn} onPress={() => addMinutes(5)}>
                            <Text style={styles.btnText}>+5 dk</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={() => addHours(1)}>
                            <Text style={styles.btnText}>+1 saat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={() => addHours(5)}>
                            <Text style={styles.btnText}>+5 saat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleReset}>
                            <Text style={styles.btnText}>Sıfırla</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btn} onPress={handlePause}>
                            <Text style={styles.btnText}>Duraklat</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={() => { timerStore.resumeTimer(); addLog('▶ Devam edildi'); }}>
                            <Text style={styles.btnText}>Devam</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.infoText}>
                        Durum: {timerStore.status} | Süre: {formatDurationCompact(Math.floor(timerStore.getElapsedMs() / 1000))}
                    </Text>
                </View>

                {/* Popup Tetikleme */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🎉 Popup Tetikle</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View style={styles.buttonRow}>
                            {[1, 2, 3, 5, 8, 12, 16, 24].map((h) => (
                                <TouchableOpacity key={h} style={styles.btnSmall} onPress={() => triggerPopup(h)}>
                                    <Text style={styles.btnText}>{h}sa</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </ScrollView>
                </View>

                {/* Kullanıcı Değiştir */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>👥 Kullanıcı Değiştir</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={testUsername}
                            onChangeText={setTestUsername}
                            placeholder="kullanici_adi"
                            placeholderTextColor={Colors.textMuted}
                            autoCapitalize="none"
                        />
                        <TouchableOpacity style={styles.btn} onPress={switchUser}>
                            <Text style={styles.btnText}>Geç</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.infoText}>Mevcut: @{authStore.profile?.username || 'yok'}</Text>
                </View>

                {/* DB & Leaderboard */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🗄️ Veritabanı & Leaderboard</Text>
                    <View style={styles.buttonRow}>
                        <TouchableOpacity style={styles.btn} onPress={checkDbStatus}>
                            <Text style={styles.btnText}>DB Durumu</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btn} onPress={refreshLeaderboard}>
                            <Text style={styles.btnText}>LB Yenile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={resetWeekly}>
                            <Text style={styles.btnText}>Haftalık Sıfırla</Text>
                        </TouchableOpacity>
                    </View>
                    {dbStats && (
                        <Text style={styles.infoText}>
                            Profil: {dbStats.profiles} | Oturum: {dbStats.sessions}
                        </Text>
                    )}
                    <Text style={styles.infoText}>
                        LB: {leaderboardStore.weeklyEntries.length} haftalık / {leaderboardStore.totalEntries.length} toplam
                    </Text>
                </View>

                {/* Log */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Log</Text>
                    <View style={styles.logContainer}>
                        {log.map((entry, i) => (
                            <Text key={i} style={styles.logText}>{entry}</Text>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    title: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize['2xl'],
        color: Colors.secondary,
        textAlign: 'center',
        marginBottom: 24,
    },
    section: {
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    sectionTitle: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        marginBottom: 12,
    },
    buttonRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    btn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    btnSmall: {
        backgroundColor: Colors.primaryDark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
    },
    btnDanger: {
        backgroundColor: Colors.error,
    },
    btnText: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.sm,
        color: Colors.textPrimary,
    },
    infoText: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        marginTop: 8,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        backgroundColor: Colors.surfaceLight,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.base,
        color: Colors.textPrimary,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    logContainer: {
        backgroundColor: Colors.background,
        borderRadius: 12,
        padding: 12,
        maxHeight: 200,
    },
    logText: {
        fontFamily: 'monospace',
        fontSize: FontSize.xs,
        color: Colors.textMuted,
        marginBottom: 4,
    },
});
/**
 * KPSS Aşkı - Test Paneli (Apple-minimalist)
 * Gizli test sayfası
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
import { Fonts, FontSize } from '../theme/typography';
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

    const testDbConnection = async () => {
        try {
            const { count: pCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
            const { count: sCount } = await supabase.from('study_sessions').select('*', { count: 'exact', head: true });
            setDbStats({ profiles: pCount || 0, sessions: sCount || 0 });
            addLog(`✅ DB bağlantısı başarılı: ${pCount} profil, ${sCount} oturum`);
        } catch (err: any) {
            addLog(`❌ DB hatası: ${err.message}`);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scroll}>
                <Text style={styles.title}>🧪 Test Paneli</Text>
                <Text style={styles.subtitle}>Geliştirici araçları</Text>

                {/* Auth Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🔑 Auth</Text>
                    <TextInput
                        style={styles.input}
                        value={testUsername}
                        onChangeText={setTestUsername}
                        placeholder="Kullanıcı adı"
                        placeholderTextColor={Colors.secondaryLabel}
                    />
                    <TouchableOpacity style={styles.button} onPress={() => authStore.login()}>
                        <Text style={styles.buttonText}>Auto Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={() => authStore.register(testUsername)}>
                        <Text style={styles.buttonText}>Register</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={() => authStore.logout()}>
                        <Text style={styles.buttonText}>Logout</Text>
                    </TouchableOpacity>
                    <Text style={styles.infoText}>
                        Auth: {authStore.isAuthenticated ? `✅ @${authStore.profile?.username}` : '❌ Yok'}
                    </Text>
                </View>

                {/* Timer Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⏱️ Timer</Text>
                    <Text style={styles.infoText}>Status: {timerStore.status}</Text>
                    <Text style={styles.infoText}>Elapsed: {formatDurationCompact(Math.floor(timerStore.getElapsedMs() / 1000))}</Text>
                    <View style={styles.row}>
                        <TouchableOpacity style={styles.smallButton} onPress={() => timerStore.status === 'idle' ? timerStore.startTimer() : timerStore.status === 'running' ? timerStore.pauseTimer() : timerStore.resumeTimer()}>
                            <Text style={styles.smallButtonText}>
                                {timerStore.status === 'idle' ? '▶' : timerStore.status === 'running' ? '⏸' : '▶'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smallButton, styles.dangerButton]} onPress={() => timerStore.resetTimer()}>
                            <Text style={styles.smallButtonText}>↺</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smallButton, styles.dangerButton]} onPress={() => timerStore.stopAndSubmitTimer()}>
                            <Text style={styles.smallButtonText}>⏹</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.infoText}>Hızlı süre ekle:</Text>
                    <View style={styles.row}>
                        {[5, 15, 30, 60].map((m) => (
                            <TouchableOpacity key={m} style={styles.smallButton} onPress={() => addMinutes(m)}>
                                <Text style={styles.smallButtonText}>+{m}dk</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.infoText}>
                        Haftalık: {formatDurationCompact(timerStore.weeklyStudySeconds)} | Toplam: {formatWithDays(timerStore.totalStudySeconds)}
                    </Text>
                </View>

                {/* Leaderboard Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🏆 Leaderboard</Text>
                    <TouchableOpacity style={styles.button} onPress={() => leaderboardStore.fetchLeaderboard()}>
                        <Text style={styles.buttonText}>Leaderboard'u Getir</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button} onPress={() => leaderboardStore.fetchActiveUsers()}>
                        <Text style={styles.buttonText}>Aktif Kullanıcıları Getir</Text>
                    </TouchableOpacity>
                    <Text style={styles.infoText}>
                        Haftalık: {leaderboardStore.weeklyEntries.length} | Toplam: {leaderboardStore.totalEntries.length}
                    </Text>
                    <Text style={styles.infoText}>
                        Aktif: {leaderboardStore.activeUsers.length} kullanıcı
                    </Text>
                </View>

                {/* DB Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🗄️ Veritabanı</Text>
                    <TouchableOpacity style={styles.button} onPress={testDbConnection}>
                        <Text style={styles.buttonText}>Bağlantıyı Test Et</Text>
                    </TouchableOpacity>
                    {dbStats && (
                        <Text style={styles.infoText}>
                            Profiller: {dbStats.profiles} | Oturumlar: {dbStats.sessions}
                        </Text>
                    )}
                </View>

                {/* Log Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📋 Log</Text>
                    {log.map((entry, i) => (
                        <Text key={i} style={styles.logText}>{entry}</Text>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.systemBackground,
    },
    scroll: {
        padding: 16,
        paddingBottom: 60,
    },
    title: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.title1,
        color: Colors.label,
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.secondaryLabel,
        marginBottom: 20,
    },
    section: {
        backgroundColor: Colors.systemGroupedBackground,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    sectionTitle: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.headline,
        color: Colors.label,
        marginBottom: 12,
    },
    input: {
        backgroundColor: Colors.systemBackground,
        borderRadius: 8,
        padding: 12,
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.label,
        marginBottom: 8,
    },
    button: {
        backgroundColor: Colors.systemBlue,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 8,
    },
    dangerButton: {
        backgroundColor: Colors.systemRed,
    },
    buttonText: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.subhead,
        color: '#FFFFFF',
    },
    smallButton: {
        backgroundColor: Colors.systemBlue,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 16,
        marginRight: 8,
        marginBottom: 8,
    },
    smallButtonText: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.footnote,
        color: '#FFFFFF',
    },
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 8,
    },
    infoText: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.footnote,
        color: Colors.secondaryLabel,
        marginBottom: 4,
    },
    logText: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.caption2,
        color: Colors.tertiaryLabel,
        marginBottom: 2,
    },
});
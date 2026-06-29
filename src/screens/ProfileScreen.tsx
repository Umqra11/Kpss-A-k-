/**
 * KPSS Aşkı - Profil Ekranı (Apple-minimalist)
 */
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing } from '../theme/spacing';
import { useAuthStore } from '../stores/authStore';
import { StatTile } from '../components/StatTile';
import { AppleButton } from '../components/AppleButton';
import { formatWithDays, formatDurationCompact } from '../theme/milestones';

export function ProfileScreen() {
    const profile = useAuthStore((s) => s.profile);
    const logout = useAuthStore((s) => s.logout);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
            >
                {/* Profil başlığı */}
                <View style={styles.header}>
                    <View style={styles.avatarLarge}>
                        <Text style={styles.avatarLetter}>
                            {profile?.username?.charAt(0).toUpperCase() || '?'}
                        </Text>
                    </View>
                    <Text style={styles.username}>@{profile?.username}</Text>
                </View>

                {/* İstatistikler */}
                <Text style={styles.sectionTitle}>İstatistikler</Text>
                <View style={styles.statsGrid}>
                    <StatTile
                        label="Bu Hafta"
                        value={formatDurationCompact(profile?.weekly_study_seconds || 0)}
                        icon="📅"
                    />
                    <StatTile
                        label="Toplam"
                        value={formatWithDays(profile?.total_study_seconds || 0)}
                        icon="⏱️"
                        highlight
                    />
                </View>
                <View style={styles.statsGrid}>
                    <StatTile
                        label="Geçen Hafta"
                        value={formatDurationCompact(profile?.previous_weekly_study_seconds || 0)}
                        icon="📊"
                    />
                    <StatTile
                        label="Durum"
                        value={profile?.is_active ? 'Çalışıyor' : 'Çevrimdışı'}
                        icon={profile?.is_active ? '🟢' : '⚪'}
                    />
                </View>

                {/* Çıkış */}
                <AppleButton
                    title="Çıkış Yap"
                    onPress={logout}
                    variant="destructive"
                    size="medium"
                    style={styles.logoutButton}
                />
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
        padding: Spacing.xl,
    },
    header: {
        alignItems: 'center',
        paddingVertical: Spacing.xxl,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.systemBlue + '15',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.md,
    },
    avatarLetter: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.title1,
        color: Colors.systemBlue,
    },
    username: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.title3,
        color: Colors.label,
    },
    sectionTitle: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.headline,
        color: Colors.label,
        marginBottom: Spacing.md,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
    },
    logoutButton: {
        marginTop: Spacing.xxxl,
    },
});
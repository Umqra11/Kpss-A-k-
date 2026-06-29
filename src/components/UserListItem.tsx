import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';

interface UserListItemProps {
    username: string;
    studySeconds: number;
    rank: number;
    isMe?: boolean;
    isActive?: boolean;
    activeIndicator?: React.ReactNode;
}

function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}s ${m}dk`;
    return `${m}dk`;
}

function getMedalEmoji(rank: number): string {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
}

function getRankDisplay(rank: number): string {
    const medal = getMedalEmoji(rank);
    return medal || `#${rank}`;
}

export function UserListItem({ username, studySeconds, rank, isMe = false, isActive = false, activeIndicator }: UserListItemProps) {
    const initials = username.charAt(0).toUpperCase();

    return (
        <View style={[styles.container, isMe && styles.isMe]}>
            <View style={styles.rankContainer}>
                <Text style={[styles.rankText, rank <= 3 && styles.rankMedal]}>
                    {getRankDisplay(rank)}
                </Text>
            </View>

            <View style={[styles.avatar, isMe && styles.avatarMe]}>
                <Text style={[styles.avatarText, isMe && styles.avatarTextMe]}>
                    {initials}
                </Text>
            </View>

            <View style={styles.info}>
                <View style={styles.nameRow}>
                    <Text style={[styles.username, isMe && styles.usernameMe]} numberOfLines={1}>
                        {username}
                    </Text>
                    {isMe && <Text style={styles.youTag}>(Sen)</Text>}
                    {isActive && activeIndicator}
                    {isActive && !activeIndicator && (
                        <View style={styles.activeDot} />
                    )}
                </View>
            </View>

            <View style={styles.timeContainer}>
                <Text style={[styles.timeText, isMe && styles.timeTextMe]}>
                    {formatTime(studySeconds)}
                </Text>
                {isActive && <Text style={styles.activeLabel}>Çalışıyor</Text>}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.systemBackground,
        borderRadius: Radius.lg,
        padding: Spacing.md,
        marginBottom: Spacing.xs,
    },
    isMe: {
        backgroundColor: Colors.systemBlue + '08',
        borderWidth: 1,
        borderColor: Colors.systemBlue + '20',
    },
    rankContainer: {
        width: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.subhead,
        color: Colors.secondaryLabel,
    },
    rankMedal: { fontSize: 22 },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.systemGray5,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.sm,
    },
    avatarMe: {
        backgroundColor: Colors.systemBlue + '20',
    },
    avatarText: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.subhead,
        color: Colors.secondaryLabel,
    },
    avatarTextMe: {
        color: Colors.systemBlue,
    },
    info: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xxs,
    },
    username: {
        fontFamily: Fonts.body.bold,
        fontSize: FontSize.body,
        color: Colors.label,
    },
    usernameMe: {
        color: Colors.systemBlue,
    },
    youTag: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.footnote,
        color: Colors.systemBlue,
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.systemGreen,
        marginLeft: Spacing.xxs,
    },
    timeContainer: {
        alignItems: 'flex-end',
    },
    timeText: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.subhead,
        color: Colors.label,
    },
    timeTextMe: {
        color: Colors.systemBlue,
    },
    activeLabel: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.caption2,
        color: Colors.systemGreen,
        marginTop: 2,
    },
});
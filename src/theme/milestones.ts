/**
 * KPSS Aşkı - Motivasyon Barajları
 * Her saat başı yeni bir baraj
 */

import { MilestoneConfig } from '../types';

export const MILESTONES: MilestoneConfig[] = [
    {
        hours: 1,
        icon: '🔥',
        title: 'İlk Kıvılcım',
        message: 'İlk 1 saat! Ateşi yaktın, devam!',
    },
    {
        hours: 2,
        icon: '⭐',
        title: 'Hızlanıyor',
        message: '2 saat! Hız kesmeden ilerliyorsun!',
    },
    {
        hours: 3,
        icon: '💪',
        title: 'Disiplin Kuşağı',
        message: '3 saat! Disiplinini konuşturuyorsun!',
    },
    {
        hours: 4,
        icon: '⚡',
        title: 'Enerji Topu',
        message: '4 saat! Enerjinle rakiplerini solluyorsun!',
    },
    {
        hours: 5,
        icon: '🎯',
        title: 'Tam Odak',
        message: '5 saat! Tam odak modundasın, hedefi 12\'den vur!',
    },
    {
        hours: 6,
        icon: '🌟',
        title: 'Parlayan Yıldız',
        message: '6 saat! Parlayan bir yıldız gibisin!',
    },
    {
        hours: 7,
        icon: '🔮',
        title: 'Sihirli Dokunuş',
        message: '7 saat! Çalışma büyüsünü herkese gösteriyorsun!',
    },
    {
        hours: 8,
        icon: '💎',
        title: 'Tam Mesai',
        message: '8 saat! Tam bir iş günü kadar çalıştın, elmas gibisin!',
    },
    {
        hours: 9,
        icon: '🦾',
        title: 'Makine Modu',
        message: '9 saat! Artık bir çalışma makinesisin!',
    },
    {
        hours: 10,
        icon: '🔥',
        title: 'Alev Topu',
        message: '10 saat! Çift haneye ulaştın, alev topu gibisin!',
    },
    {
        hours: 11,
        icon: '🌪️',
        title: 'Kasırga',
        message: '11 saat! Çalışma kasırgası önünde kimse duramaz!',
    },
    {
        hours: 12,
        icon: '🏅',
        title: 'Yarım Gün',
        message: '12 saat! Yarım günü devirdin, madalya senin!',
    },
    {
        hours: 13,
        icon: '🧠',
        title: 'Bilgi Hazinesi',
        message: '13 saat! Beynin bir bilgi hazinesine dönüşüyor!',
    },
    {
        hours: 14,
        icon: '⚔️',
        title: 'Savaşçı Ruhu',
        message: '14 saat! Savaşçı ruhunla imkansız yok!',
    },
    {
        hours: 15,
        icon: '🛡️',
        title: 'Zırh Kuşan',
        message: '15 saat! Yorulmaz zırhını kuşandın!',
    },
    {
        hours: 16,
        icon: '👑',
        title: 'Taç Giy',
        message: '16 saat! Taç senin hakkın, lider sensin!',
    },
    {
        hours: 17,
        icon: '⛰️',
        title: 'Zirveye Tırmanış',
        message: '17 saat! Dağın zirvesine ramak kaldı!',
    },
    {
        hours: 18,
        icon: '🌊',
        title: 'Dalgayı Yakala',
        message: '18 saat! Verimlilik dalgasını sörflüyorsun!',
    },
    {
        hours: 19,
        icon: '🦅',
        title: 'Kartal Bakışı',
        message: '19 saat! Kartal gibi yükseklerden bakıyorsun!',
    },
    {
        hours: 20,
        icon: '🚀',
        title: 'Roket Hızı',
        message: '20 saat! Zirveye roket hızında gidiyorsun!',
    },
    {
        hours: 21,
        icon: '🌙',
        title: 'Gece Kuşu',
        message: '21 saat! Gece gündüz demeden çalışıyorsun!',
    },
    {
        hours: 22,
        icon: '🎪',
        title: 'Gösteri Zamanı',
        message: '22 saat! Bu performans alkışlanır!',
    },
    {
        hours: 23,
        icon: '🧨',
        title: 'Fitil Ateşlendi',
        message: '23 saat! Fitil ateşlendi, patlamaya hazır!',
    },
    {
        hours: 24,
        icon: '🏆',
        title: 'Tam Gün',
        message: '24 saat! Tam 1 gün! Sen bir efsanesin!',
    },
];

export const getMilestoneForHours = (
    hours: number,
    alreadyEarned: number[]
): MilestoneConfig | null => {
    const milestone = MILESTONES.find(
        (m) => Math.floor(hours) >= m.hours && !alreadyEarned.includes(m.hours)
    );
    return milestone || null;
};

export const getNextMilestone = (hours: number): MilestoneConfig | null => {
    return MILESTONES.find((m) => m.hours > hours) || null;
};

export const formatDurationHours = (totalSeconds: number): number => {
    return Math.floor(totalSeconds / 3600);
};

export const formatDuration = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatDurationCompact = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    if (hours > 0) return `${hours}s ${minutes}dk`;
    if (minutes > 0) return `${minutes}dk`;
    return `${totalSeconds}sn`;
};

export const getDaysFromSeconds = (totalSeconds: number): number => {
    return Math.floor(totalSeconds / 86400);
};

export const formatWithDays = (totalSeconds: number): string => {
    const days = getDaysFromSeconds(totalSeconds);
    const remainingSeconds = totalSeconds % 86400;
    const hours = Math.floor(remainingSeconds / 3600);
    const minutes = Math.floor((remainingSeconds % 3600) / 60);

    if (days > 0) {
        return `${days} gün ${hours}s ${minutes}dk`;
    }
    return formatDurationCompact(totalSeconds);
};
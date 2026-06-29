/**
 * KPSS Aşkı - Kayıt/Giriş Ekranı
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { FontSize } from '../theme/typography';
import { useAuthStore } from '../stores/authStore';

export function AuthScreen() {
    const [username, setUsername] = useState('');
    const register = useAuthStore((s) => s.register);
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);
    const clearError = useAuthStore((s) => s.clearError);

    const handleSubmit = async () => {
        await register(username);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>🎯</Text>
                    <Text style={styles.title}>KPSS Aşkı</Text>
                    <Text style={styles.subtitle}>Birlikte Daha Güçlüyüz</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Kullanıcı adın nedir?</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputIcon}>@</Text>
                        <TextInput
                            style={styles.input}
                            value={username}
                            onChangeText={(t) => {
                                setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                                if (error) clearError();
                            }}
                            placeholder="kullanici_adi"
                            placeholderTextColor={Colors.textMuted}
                            autoCapitalize="none"
                            autoCorrect={false}
                            maxLength={30}
                            editable={!isLoading}
                        />
                    </View>

                    {error && (
                        <Text style={styles.errorText}>{error}</Text>
                    )}

                    <TouchableOpacity
                        style={[styles.button, username.length < 3 && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={isLoading || username.length < 3}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={Colors.textPrimary} />
                        ) : (
                            <Text style={styles.buttonText}>🚀 BAŞLA</Text>
                        )}
                    </TouchableOpacity>

                    <Text style={styles.hint}>
                        Şifre yok! Bir kere kayıt ol,{' '}
                        her zaman hatırlansın.
                    </Text>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    emoji: {
        fontSize: 56,
        marginBottom: 16,
    },
    title: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize['3xl'],
        color: Colors.textPrimary,
        marginBottom: 8,
    },
    subtitle: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.lg,
        color: Colors.textSecondary,
    },
    form: {
        width: '100%',
    },
    label: {
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.base,
        color: Colors.textSecondary,
        marginBottom: 12,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    inputIcon: {
        fontFamily: 'Satoshi-Bold',
        fontSize: FontSize.lg,
        color: Colors.primaryLight,
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontFamily: 'Satoshi-Medium',
        fontSize: FontSize.md,
        color: Colors.textPrimary,
        paddingVertical: 16,
    },
    errorText: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.sm,
        color: Colors.error,
        marginBottom: 12,
    },
    button: {
        backgroundColor: Colors.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonDisabled: {
        backgroundColor: Colors.buttonDisabled,
        shadowOpacity: 0,
        elevation: 0,
    },
    buttonText: {
        fontFamily: 'ClashDisplay-Bold',
        fontSize: FontSize.lg,
        color: Colors.textPrimary,
        letterSpacing: 2,
    },
    hint: {
        fontFamily: 'Satoshi-Regular',
        fontSize: FontSize.sm,
        color: Colors.textMuted,
        textAlign: 'center',
        lineHeight: 20,
    },
});
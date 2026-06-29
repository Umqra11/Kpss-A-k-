/**
 * KPSS Aşkı - Giriş Ekranı (Apple-minimalist)
 */
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Colors } from '../theme/colors';
import { Fonts, FontSize } from '../theme/typography';
import { Spacing, Radius } from '../theme/spacing';
import { useAuthStore } from '../stores/authStore';
import { AppleButton } from '../components/AppleButton';

export function AuthScreen() {
    const [username, setUsername] = useState('');
    const register = useAuthStore((s) => s.register);
    const login = useAuthStore((s) => s.login);
    const isLoading = useAuthStore((s) => s.isLoading);
    const error = useAuthStore((s) => s.error);
    const clearError = useAuthStore((s) => s.clearError);

    const handleSubmit = async () => {
        if (username.trim().length >= 3) {
            await register(username.trim());
        }
    };

    React.useEffect(() => {
        login();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.inner}
            >
                <View style={styles.header}>
                    <Text style={styles.logo}>⏱️</Text>
                    <Text style={styles.title}>KPSS Aşkı</Text>
                    <Text style={styles.subtitle}>
                        Çalışma arkadaşlarınla birlikte{'\n'}daha motive çalış
                    </Text>
                </View>

                <View style={styles.form}>
                    <TextInput
                        style={styles.input}
                        placeholder="Kullanıcı adı"
                        placeholderTextColor={Colors.tertiaryLabel}
                        value={username}
                        onChangeText={(text) => {
                            setUsername(text);
                            if (error) clearError();
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={30}
                        editable={!isLoading}
                    />
                    {error && <Text style={styles.error}>{error}</Text>}

                    <AppleButton
                        title={isLoading ? 'Giriş yapılıyor...' : 'Başla'}
                        onPress={handleSubmit}
                        variant="primary"
                        size="large"
                        disabled={isLoading || username.trim().length < 3}
                        style={styles.button}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.systemBackground,
    },
    inner: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: Spacing.xxl,
    },
    header: {
        alignItems: 'center',
        marginBottom: Spacing.xxxl,
    },
    logo: {
        fontSize: 64,
        marginBottom: Spacing.md,
    },
    title: {
        fontFamily: Fonts.display.bold,
        fontSize: FontSize.largeTitle,
        color: Colors.label,
        marginBottom: Spacing.xs,
    },
    subtitle: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.secondaryLabel,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: Spacing.md,
    },
    input: {
        backgroundColor: Colors.systemGray6,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.body,
        color: Colors.label,
    },
    error: {
        fontFamily: Fonts.body.regular,
        fontSize: FontSize.footnote,
        color: Colors.systemRed,
        textAlign: 'center',
    },
    button: {
        marginTop: Spacing.xs,
    },
});
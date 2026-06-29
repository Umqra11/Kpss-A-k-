/**
 * KPSS Aşkı - Ana Uygulama
 * Expo + React Native + Supabase
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from './src/stores/authStore';
import { useTimerStore } from './src/stores/timerStore';
import { AuthScreen } from './src/screens/AuthScreen';
import { MainScreen } from './src/screens/MainScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { Colors } from './src/theme/colors';
import { FontSize } from './src/theme/typography';

const Tab = createBottomTabNavigator();

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          fontFamily: 'Satoshi-Medium',
          fontSize: FontSize.xs,
        },
      }}
    >
      <Tab.Screen
        name="Main"
        component={MainScreen}
        options={{
          tabBarLabel: 'Kronometre',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>⏱️</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Sıralama',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏆</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const login = useAuthStore((s) => s.login);
  const loadTimerState = useTimerStore((s) => s.loadTimerState);

  useEffect(() => {
    async function init() {
      await login();
      await loadTimerState();
    }
    init();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingEmoji}>🎯</Text>
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>KPSS Aşkı</Text>
      </View>
    );
  }

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: Colors.primary,
          background: Colors.background,
          card: Colors.surface,
          text: Colors.textPrimary,
          border: Colors.border,
          notification: Colors.secondary,
        },
        fonts: {
          regular: { fontFamily: 'Satoshi-Regular', fontWeight: '400' },
          medium: { fontFamily: 'Satoshi-Medium', fontWeight: '500' },
          bold: { fontFamily: 'Satoshi-Bold', fontWeight: '700' },
          heavy: { fontFamily: 'ClashDisplay-Bold', fontWeight: '900' },
        },
      }}
    >
      <StatusBar style="light" />
      {isAuthenticated ? <AppTabs /> : <AuthScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  spinner: {
    marginBottom: 16,
  },
  loadingText: {
    fontFamily: 'ClashDisplay-Bold',
    fontSize: FontSize.xl,
    color: Colors.primaryLight,
  },
});
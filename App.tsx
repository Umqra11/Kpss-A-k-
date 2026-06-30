/**
 * KPSS Aşkı - Ana Uygulama (Apple-minimalist)
 * v8: Temiz routing, dark mode hazırlığı
 */
import React, { useEffect } from 'react';
import {
  StatusBar,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import * as Linking from 'expo-linking';
import { ColorsLight, ColorsDark } from './src/theme/colors';
import { Fonts, FontSize } from './src/theme/typography';
import { useAuthStore } from './src/stores/authStore';
import { useFontLoader } from './src/hooks/useFontLoader';
import { useColorSchemeStore } from './src/stores/colorSchemeStore';
import { AuthScreen } from './src/screens/AuthScreen';
import { RoomSelectionScreen } from './src/screens/RoomSelectionScreen';
import { MainScreen } from './src/screens/MainScreen';
import { LeaderboardScreen } from './src/screens/LeaderboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const profile = useAuthStore((s) => s.profile);
  const login = useAuthStore((s) => s.login);
  const { fontsLoaded } = useFontLoader();
  const loadColorScheme = useColorSchemeStore((s) => s.loadColorScheme);

  const systemScheme = useColorScheme();
  const userPreference = useColorSchemeStore((s) => s.colorScheme);
  const effectiveScheme =
    userPreference === 'system' ? systemScheme : userPreference;
  const Colors = effectiveScheme === 'dark' ? ColorsDark : ColorsLight;

  useEffect(() => {
    login();
    loadColorScheme();
  }, []);

  if (!fontsLoaded || isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.systemBackground }]}>
        <ActivityIndicator size="large" color={Colors.systemBlue} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <StatusBar
          barStyle={effectiveScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.systemBackground}
        />
        <AuthScreen />
      </>
    );
  }

  if (!profile?.current_room_id) {
    return (
      <>
        <StatusBar
          barStyle={effectiveScheme === 'dark' ? 'light-content' : 'dark-content'}
          backgroundColor={Colors.systemBackground}
        />
        <RoomSelectionScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar
        barStyle={effectiveScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={Colors.systemBackground}
      />
      <NavigationContainer
        linking={{
          prefixes: [Linking.createURL('/')],
          config: {
            screens: {
              Main: 'main',
              Leaderboard: 'leaderboard',
              Profile: 'profile',
            },
          },
        }}
      >
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: Colors.systemBackground,
              borderTopColor: Colors.separator,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingTop: 8,
              paddingBottom: 12,
              height: 56,
            },
            tabBarActiveTintColor: Colors.systemBlue,
            tabBarInactiveTintColor: Colors.secondaryLabel,
            tabBarLabelStyle: {
              fontFamily: Fonts.body.bold,
              fontSize: FontSize.caption2,
              marginTop: 2,
            },
          }}
        >
          <Tab.Screen
            name="Main"
            component={MainScreen}
            options={{
              tabBarLabel: 'Çalış',
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20, color }}>⏱</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              tabBarLabel: 'Sıralama',
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20, color }}>🏆</Text>
              ),
            }}
          />
          <Tab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              tabBarLabel: 'Profil',
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20, color }}>👤</Text>
              ),
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

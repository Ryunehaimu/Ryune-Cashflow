import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import 'react-native-reanimated';
import { auth } from '../firebaseConfig';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';

const { width } = Dimensions.get('window');

export const unstable_settings = {
  anchor: '(tabs)',
};

const TAB_ROUTES = [
  { name: '/(tabs)', segment: 'index', icon: 'grid', iconOutline: 'grid-outline', label: 'Dashboard' },
  { name: '/(tabs)/add', segment: 'add', icon: 'add-circle', iconOutline: 'add-circle-outline', label: 'Entry' },
  { name: '/(tabs)/wallets', segment: 'wallets', icon: 'wallet', iconOutline: 'wallet-outline', label: 'Wallets' },
  { name: '/(tabs)/debts', segment: 'debts', icon: 'document-text', iconOutline: 'document-text-outline', label: 'Obligations' },
];

function FloatingTabBar({
  currentSegment,
  onNavigate,
}: {
  currentSegment: string;
  onNavigate: (name: string) => void;
}) {
  return (
    <View style={styles.tabBarWrap} pointerEvents="box-none">
      <View style={styles.tabBar}>
        {TAB_ROUTES.map((tab: any) => {
          const isFocused = currentSegment === tab.segment;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => onNavigate(tab.name)}
              activeOpacity={0.8}
              style={[styles.pill, isFocused ? styles.pillActive : styles.pillInactive]}
            >
              <Ionicons
                size={20}
                name={isFocused ? tab.icon : tab.iconOutline}
                color={isFocused ? '#000' : '#8e8e93'}
              />
              {isFocused && <Text style={styles.pillText}>{tab.label}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <RootContent />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

function RootContent() {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const subscriber = onAuthStateChanged(auth, async (usr) => {
      if (usr) {
        try {
          const timestamp = await AsyncStorage.getItem('loginTimestamp');
          if (timestamp && Date.now() - parseInt(timestamp) < 3600000) {
            setUser(usr);
          } else {
            await auth.signOut();
            await AsyncStorage.removeItem('loginTimestamp');
            setUser(null);
          }
        } catch {
          setUser(null);
        }
      } else {
        await AsyncStorage.removeItem('loginTimestamp').catch(() => { });
        setUser(null);
      }
      setInitializing(false);
    });

    return subscriber;
  }, []);

  useEffect(() => {
    if (initializing) return;

    const inAuthGroup =
      segments[0] === '(tabs)' || segments[0] === 'wallet';

    if (user && !inAuthGroup) {
      router.replace('/(tabs)');
    } else if (!user && segments[0] !== 'login') {
      router.replace('/login');
    }
  }, [user, initializing, segments]);

  if (initializing) return null;

  const inTabs = segments[0] === '(tabs)';
  const currentSegment = segments[1] ?? 'index';

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="wallet/[id]" />
      </Stack>

      {inTabs && (
        <FloatingTabBar
          currentSegment={currentSegment}
          onNavigate={(name) => router.navigate(name as any)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  tabBarWrap: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1e',
    borderRadius: 100,
    padding: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    height: 48,
    marginHorizontal: 3,
  },
  pillActive: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
  },
  pillInactive: {
    width: 48,
    backgroundColor: '#2c2c2e',
  },
  pillText: {
    marginLeft: 8,
    color: '#000000',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: -0.2,
  },
});
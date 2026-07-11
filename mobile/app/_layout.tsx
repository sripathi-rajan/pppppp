import { Stack, usePathname, useRouter } from 'expo-router';
import { HistoryProvider } from '../hooks/useHistory';
import { SettingsProvider } from '../hooks/useSettings';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Platform, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          <HistoryProvider>
            {Platform.OS === 'web' && (
              <style dangerouslySetInnerHTML={{ __html: `
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;600;800&family=Playfair+Display:ital,wght@0,400;0,600;1,400;1,600&display=swap');
                body, input, button, textarea { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; outline: none !important; }
                h1, h2, h3, .logo-text, [data-testid="logo"] { font-family: 'Outfit', sans-serif !important; }
              `}} />
            )}
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom', 'left']}>
              <RootNavigator />
            </SafeAreaView>
          </HistoryProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const { hasCompletedOnboarding, initialized } = useSettings();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !initialized) return;

    // Use pathname instead of segments for more reliable matching
    const isOnAuthGroup = pathname.startsWith('/(tabs)') || pathname === '/location' || pathname === '/vehicle';
    const isOnLogin = pathname === '/login';
    const isOnboarding = pathname === '/';

    if (!isAuthenticated && isOnAuthGroup) {
      // Trying to access protected route without auth → login
      router.replace('/login');
    } else if (isAuthenticated && (isOnLogin || isOnboarding)) {
      // Logged in but on auth screens → tabs
      router.replace('/(tabs)');
    } else if (!isAuthenticated && isOnboarding && hasCompletedOnboarding) {
       // Completed onboarding but not logged in → login
       router.replace('/login');
    }
  }, [isAuthenticated, isLoading, initialized, pathname, hasCompletedOnboarding]);

  // Show a blank splash while we're resolving the auth state from storage
  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF8F5', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#C9621D" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="location" />
      <Stack.Screen name="vehicle" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="sos" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

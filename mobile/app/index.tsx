import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSettings } from '../hooks/useSettings';

export default function OnboardingScreen() {
  const router = useRouter();
  const { initialized, hasCompletedOnboarding, completeOnboarding } = useSettings();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!initialized) return;
    if (!hasCompletedOnboarding) {
      // First time → show onboarding
      setIsReady(true);
    } else {
      // If onboarding is done, proceed to login (where _layout.tsx auth guard handles routing)
      router.replace('/login');
    }
  }, [initialized, hasCompletedOnboarding]);

  if (!isReady) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.logoText}>DriveLegal</Text>
      </View>
    );
  }


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        
        {/* Logo Section */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoIconText}>DL</Text>
          </View>
          <Text style={styles.logoText}>DriveLegal</Text>
        </View>

        <View style={styles.mainBody}>
          {/* Headline */}
          <Text style={styles.headline}>
            Know the rules,{'\n'}wherever you <Text style={styles.italicHighlight}>drive.</Text>
          </Text>

          {/* Subheadline */}
          <Text style={styles.subheadline}>
            Plain-language traffic laws, fines and rights — for your exact street, in your language.
          </Text>
        </View>

        {/* Footer / Actions */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={async () => {
              await completeOnboarding();
              router.push('/login');
            }}
          >
            <Text style={styles.primaryButtonText}>Get started</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" style={styles.buttonIcon} />
          </TouchableOpacity>
        </View>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // Deep modern dark blue
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#38BDF8', // Bright blue accent
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoIconText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 16,
  },
  logoText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F8FAFC',
    fontFamily: Platform.OS === 'web' ? 'Outfit, sans-serif' : 'System',
    letterSpacing: -0.5,
  },
  mainBody: {
    flex: 1,
    justifyContent: 'center',
    marginTop: -40,
  },
  headline: {
    fontSize: 48,
    lineHeight: 54,
    color: '#F8FAFC',
    fontFamily: Platform.OS === 'web' ? '"Playfair Display", serif' : 'serif',
    marginBottom: 24,
    letterSpacing: -1.5,
  },
  italicHighlight: {
    color: '#38BDF8',
    fontStyle: 'italic',
  },
  subheadline: {
    fontSize: 18,
    lineHeight: 28,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
    maxWidth: '90%',
  },
  footer: {
    width: '100%',
  },
  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 24,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  buttonIcon: {
    marginLeft: 8,
    color: '#0F172A',
  },
  signInRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    color: '#6b7280',
    fontSize: 14,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  },
  signInLink: {
    color: '#C9621D',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : 'System',
  }
});

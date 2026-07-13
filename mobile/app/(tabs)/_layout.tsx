import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, StyleSheet } from 'react-native';
import { useSettings } from '../../hooks/useSettings';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabLayout() {
  const { t } = useSettings();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#38BDF8',
          tabBarInactiveTintColor: '#64748B',
          tabBarHideOnKeyboard: true,
          tabBarStyle: {
            backgroundColor: '#1E293B',
            borderTopColor: '#334155',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 80 + insets.bottom : 65 + insets.bottom,
            paddingBottom: Platform.OS === 'ios' ? insets.bottom + 5 : insets.bottom + 8,
            paddingTop: 10,
            elevation: 8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
          },
          tabBarItemStyle: {
            justifyContent: 'center',
            alignItems: 'center',
            flex: 1,
          },
          headerShown: false,
          tabBarLabelStyle: {
            fontSize: 11,
            marginTop: 4,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tab_home'),
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="home-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="ask"
          options={{
            title: t('tab_ask'),
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="chatbubble-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="fines"
          options={{
            title: 'Fines & Rules',
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="document-text-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="zones"
          options={{
            href: null,
            title: t('tab_rules'),
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="book-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="map"
          options={{
            title: t('tab_map'),
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="map-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tab_you'),
            tabBarIcon: ({ color }) => (
              <View style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
                <Ionicons name="person-outline" size={24} color={color} />
              </View>
            ),
          }}
        />
        
        {/* Hide tabs that aren't in the bottom bar */}
        <Tabs.Screen name="report" options={{ href: null }} />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
});

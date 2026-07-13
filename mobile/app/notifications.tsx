import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '../lib/api';
import { useSettings } from '../hooks/useSettings';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;        // ISO timestamp from server
  type: 'alert' | 'info' | 'warning';
  icon: string;
  iconBg: string;
  iconColor: string;
  actionLabel?: string | null;
  route?: string | null;
}

const CLEARED_KEY = '@drivelegal_cleared_notifications';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  try {
    const then = new Date(isoString).getTime();
    const now = Date.now();
    const diff = Math.floor((now - then) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
    return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? 's' : ''} ago`;
  } catch {
    return '';
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { sharedLocation } = useSettings();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch from API ──────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    setError(null);

    try {
      // Build URL with optional GPS / zone context
      const base = getApiBaseUrl();
      const params = new URLSearchParams();
      if (sharedLocation.latitude)  params.set('lat',         String(sharedLocation.latitude));
      if (sharedLocation.longitude) params.set('lon',         String(sharedLocation.longitude));
      if (sharedLocation.zoneType)  params.set('zone_type',   sharedLocation.zoneType);
      if (sharedLocation.speedLimit !== null && sharedLocation.speedLimit !== undefined) {
        params.set('speed_limit', String(sharedLocation.speedLimit));
      }

      const url = `${base}/notifications?${params.toString()}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      if (!res.ok) throw new Error(`Server error ${res.status}`);

      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.notifications)) {
        // Filter out any previously cleared IDs
        const clearedRaw = await AsyncStorage.getItem(CLEARED_KEY);
        const cleared: string[] = clearedRaw ? JSON.parse(clearedRaw) : [];

        const visible = (data.notifications as NotificationItem[]).filter(
          (n) => !cleared.includes(n.id)
        );
        setNotifications(visible);
      } else {
        throw new Error('Unexpected response shape');
      }
    } catch (err: any) {
      console.warn('[Notifications] fetch failed:', err?.message);
      setError(err?.message || 'Could not load notifications');
      // If we had previously loaded items, keep them
      if (!isRefresh) setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sharedLocation]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Dismiss single notification ─────────────────────────────────────────────

  const dismissNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    try {
      const clearedRaw = await AsyncStorage.getItem(CLEARED_KEY);
      const cleared: string[] = clearedRaw ? JSON.parse(clearedRaw) : [];
      if (!cleared.includes(id)) {
        cleared.push(id);
        await AsyncStorage.setItem(CLEARED_KEY, JSON.stringify(cleared));
      }
    } catch (e) {
      console.warn('[Notifications] Could not persist dismissed id:', e);
    }
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────

  const clearAll = useCallback(async () => {
    const ids = notifications.map((n) => n.id);
    setNotifications([]);

    try {
      const clearedRaw = await AsyncStorage.getItem(CLEARED_KEY);
      const cleared: string[] = clearedRaw ? JSON.parse(clearedRaw) : [];
      const merged = Array.from(new Set([...cleared, ...ids]));
      await AsyncStorage.setItem(CLEARED_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn('[Notifications] Could not persist clear-all:', e);
    }
  }, [notifications]);

  // ── Action handler ──────────────────────────────────────────────────────────

  const handleAction = (route?: string | null) => {
    if (route) router.push(route as any);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {notifications.length > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{notifications.length}</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearAll}
            disabled={notifications.length === 0}
          >
            <Text style={[styles.clearButtonText, notifications.length === 0 && { opacity: 0.3 }]}>
              Clear all
            </Text>
          </TouchableOpacity>
        </View>

        {/* Body */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#D97706" />
            <Text style={styles.loadingText}>Fetching live alerts…</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchNotifications(true)}
                tintColor="#D97706"
                colors={['#D97706']}
              />
            }
          >
            {/* Error banner (shown alongside cached content if any) */}
            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="cloud-offline-outline" size={16} color="#9CA3AF" />
                <Text style={styles.errorText}>
                  {`Offline — pull down to retry. (${error})`}
                </Text>
              </View>
            )}

            {notifications.length === 0 && !error ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>All caught up!</Text>
                <Text style={styles.emptySubtitle}>
                  No active traffic alerts or advisories right now.{'\n'}
                  Pull down to refresh.
                </Text>
              </View>
            ) : (
              notifications.map((item) => (
                <View key={item.id} style={styles.notificationCard}>
                  {/* Dismiss (×) */}
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => dismissNotification(item.id)}
                    hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                  >
                    <Ionicons name="close-circle" size={18} color="#D1D5DB" />
                  </TouchableOpacity>

                  <View style={styles.cardHeader}>
                    <View style={[styles.iconWrapper, { backgroundColor: item.iconBg }]}>
                      <Ionicons name={item.icon as any} size={18} color={item.iconColor} />
                    </View>
                    <View style={styles.titleContainer}>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.time}>{relativeTime(item.time)}</Text>
                    </View>
                  </View>

                  <Text style={styles.bodyText}>{item.body}</Text>

                  {item.actionLabel && (
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionButton, { borderColor: item.iconColor }]}
                        onPress={() => handleAction(item.route)}
                      >
                        <Text style={[styles.actionButtonText, { color: item.iconColor }]}>
                          {item.actionLabel}
                        </Text>
                        <Ionicons name="arrow-forward" size={14} color={item.iconColor} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Footer hint */}
            {notifications.length > 0 && (
              <Text style={styles.footerHint}>Pull down to refresh · Swipe × to dismiss</Text>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: { padding: 4 },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  clearButton: { padding: 4 },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
  },

  // Loading
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
  },

  // Scroll
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
    lineHeight: 20,
  },

  // Card
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
  },
  dismissBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingRight: 24,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleContainer: { flex: 1 },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  bodyText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 14,
    paddingLeft: 48,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingLeft: 48,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Footer
  footerHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
});

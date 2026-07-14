import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Tier, TinyModelStatus } from '../hooks/useSmartChat';

interface OfflineBannerProps {
  tier: Tier;
  tinyModelStatus: TinyModelStatus;
  tinyDownloadProgress: number;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  tier,
  tinyModelStatus,
  tinyDownloadProgress,
}) => {
  if (tier === 'cloud') return null;

  if (Platform.OS === 'web' && tinyModelStatus === 'downloading') {
    return (
      <View style={styles.banner}>
        <Ionicons name="download-outline" size={16} color="#92400e" />
        <Text style={styles.text}>Preparing offline assistant… {tinyDownloadProgress}%</Text>
      </View>
    );
  }

  if (tier === 'tiny') {
    return (
      <View style={styles.banner}>
        <Ionicons name="hardware-chip-outline" size={16} color="#92400e" />
        <Text style={styles.text}>
          You're offline — answering with the on-device assistant. Double-check exact fines once
          you're back online.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <Ionicons name="cloud-offline-outline" size={16} color="#92400e" />
      <Text style={styles.text}>You're offline and the cloud AI can't be reached right now.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  text: {
    flex: 1,
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },
});

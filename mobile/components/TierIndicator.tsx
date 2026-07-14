import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Tier } from '../hooks/useSmartChat';

interface TierIndicatorProps {
  tier: Tier;
}

const TIER_CONFIG: Record<Tier, { dot: string; label: string; color: string }> = {
  cloud: { dot: '#10b981', label: 'Cloud AI', color: '#10b981' },
  tiny: { dot: '#d97706', label: 'Offline AI', color: '#d97706' },
  offline: { dot: '#ef4444', label: 'Basic mode', color: '#ef4444' },
};

export const TierIndicator: React.FC<TierIndicatorProps> = ({ tier }) => {
  const config = TIER_CONFIG[tier];
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, { backgroundColor: config.dot }]} />
      <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

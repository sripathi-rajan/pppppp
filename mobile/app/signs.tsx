import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getApiBaseUrl } from '../lib/api';

const API_BASE_URL = getApiBaseUrl();

export default function TrafficSignsScreen() {
  const router = useRouter();
  const [signs, setSigns] = useState<{ id: string, name: string, image_url: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSigns = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/signs`);
        const data = await response.json();
        if (data.status === 'ok') {
          setSigns(data.signs);
        } else {
          setError(true);
        }
      } catch (error) {
        console.error("Error fetching signs:", error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSigns();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1c1c1c" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Traffic Signs</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#d97706" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline-outline" size={32} color="#9ca3af" />
          <Text style={styles.errorText}>Couldn't load traffic signs. Check your connection and try again.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>Common Indian Traffic Signs</Text>
          <View style={styles.grid}>
            {signs.map((sign) => (
              <View key={sign.id} style={styles.card}>
                <View style={styles.imagePlaceholder}>
                  {sign.image_url ? (
                    <Image
                      source={{ uri: `${API_BASE_URL}${sign.image_url}` }}
                      style={styles.signImage}
                      resizeMode="contain"
                    />
                  ) : (
                    <Ionicons name="warning-outline" size={32} color="#9ca3af" />
                  )}
                </View>
                <Text style={styles.signName} numberOfLines={2}>{sign.name}</Text>
              </View>
            ))}
            {signs.length % 2 === 1 && <View style={styles.cardSpacer} />}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF8F5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardSpacer: { width: '48%' },
  errorText: { marginTop: 12, fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 32 },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#f3f4f6', borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden' },
  signImage: { width: 60, height: 60 },
  signName: { fontSize: 14, fontWeight: '600', color: '#374151', textAlign: 'center' }
});

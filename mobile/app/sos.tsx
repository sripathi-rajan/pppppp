import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';
import { getApiBaseUrl } from '../lib/api';

export default function SOSScreen() {
  const router = useRouter();
  const { profile, updateProfile } = useSettings();
  const { user, token, updateUser } = useAuth();
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const holdProgress = useRef(new Animated.Value(0)).current;
  const [holding, setHolding] = useState(false);
  const [processing, setProcessing] = useState(false);
  const holdTimer = useRef<NodeJS.Timeout | null>(null);

  const [emergencyName, setEmergencyName] = useState(profile.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergencyContact || '');

  useEffect(() => {
    setEmergencyName(profile.emergencyContactName || '');
    setEmergencyPhone(profile.emergencyContact || '');
  }, [profile.emergencyContactName, profile.emergencyContact]);

  const handleSaveContact = async () => {
    if (!emergencyName.trim() || !emergencyPhone.trim()) {
      Alert.alert('Error', 'Please enter both name and phone number');
      return;
    }
    
    updateProfile({ 
      emergencyContact: emergencyPhone, 
      emergencyContactName: emergencyName 
    });
    
    if (user && token) {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/auth/update`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            emergencyContact: emergencyPhone,
            emergencyContactName: emergencyName,
          })
        });
        if (!res.ok) {
          console.warn('Error saving emergency contact: server returned', res.status);
          Alert.alert('Saved locally', 'Contact saved on this device, but syncing to your account failed.');
          return;
        }
      } catch (e) {
        console.warn('Error saving emergency contact:', e);
        Alert.alert('Saved locally', 'Contact saved on this device, but syncing to your account failed.');
        return;
      }
    }
    Alert.alert('Success', 'Emergency contact saved!');
  };

  useEffect(() => {
    return () => {
      if (holdTimer.current) clearTimeout(holdTimer.current);
    };
  }, []);

  const triggerEmergencyCall = async () => {
    setProcessing(true);
    let numberToCall = '112'; // Default general emergency (112)
    let lat = 13.0827;
    let lon = 80.2707;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const fetchLocation = async () => {
          let loc = await Location.getLastKnownPositionAsync({});
          if (!loc) {
            loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          }
          return loc;
        };

        const timeoutPromise = new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
        const locResult = await Promise.race([fetchLocation(), timeoutPromise]) as any;

        if (locResult && locResult.coords) {
          lat = locResult.coords.latitude;
          lon = locResult.coords.longitude;
          try {
            const geocode = await Location.reverseGeocodeAsync(locResult.coords);
            if (geocode && geocode.length > 0) {
              const place = geocode[0];
              const address = [place.street, place.name, place.district, place.subregion].join(' ').toLowerCase();
              if (address.includes('highway') || address.includes('expressway') || address.includes('nh ') || address.includes('ah ')) {
                numberToCall = '1033'; // Highway Patrol
              } else if (place.country === 'United States') {
                numberToCall = '911';
              } else if (place.country === 'United Kingdom') {
                numberToCall = '999';
              }
            }
          } catch (err) {
            console.log('Geocoding error in SOS trigger', err);
          }
        }
      }
    } catch (e) {
      console.log('Location fetch failed or timed out in SOS trigger', e);
    }
    
    setProcessing(false);

    const contactName = profile.emergencyContactName || 'Emergency Contact';
    const smsMessage = `EMERGENCY! ${contactName}, I need immediate roadside assistance. My live GPS coordinates: https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    const contactNum = profile.emergencyContact || '';

    if (contactNum) {
      const smsUrl = Platform.OS === 'ios'
        ? `sms:${contactNum}&body=${encodeURIComponent(smsMessage)}`
        : `sms:${contactNum}?body=${encodeURIComponent(smsMessage)}`;

      Alert.alert(
        "SOS Triggered",
        `Emergency SMS payload prepared for ${contactName} (${contactNum}). We will also dial ${numberToCall}.`,
        [
          {
            text: "Send SMS & Call",
            onPress: () => {
              Linking.openURL(smsUrl)
                .catch(() => {})
                .finally(() => {
                  setTimeout(() => {
                    Linking.openURL(`tel:${numberToCall}`).catch(() => {});
                  }, 1200);
                });
            }
          },
          {
            text: "Only Call Services",
            onPress: () => Linking.openURL(`tel:${numberToCall}`).catch(() => {})
          },
          {
            text: "Cancel",
            style: "cancel"
          }
        ]
      );
    } else {
      Alert.alert(
        "SOS Triggered",
        `Dialing emergency services: ${numberToCall}. (Tip: configure emergency contact below to auto-alert them).`,
        [
          { text: "Call Now", onPress: () => Linking.openURL(`tel:${numberToCall}`).catch(() => {}) },
          { text: "Cancel", style: "cancel" }
        ]
      );
    }
  };

  const handlePressIn = () => {
    if (processing) return;
    setHolding(true);
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(holdProgress, {
      toValue: 100,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    holdTimer.current = setTimeout(() => {
      handlePressOut();
      triggerEmergencyCall();
    }, 3000);
  };

  const handlePressOut = () => {
    if (processing) return;
    setHolding(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    
    scaleAnim.stopAnimation();
    holdProgress.stopAnimation();
    
    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    Animated.timing(holdProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
            <Ionicons name="close" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Roadside help</Text>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>24/7</Text>
          </View>
        </View>

        {/* SOS BUTTON */}
        <View style={styles.sosSection}>
          <Animated.View style={[styles.sosRipple, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.sosRippleInner} />
          </Animated.View>
          
          <Animated.View style={[
            styles.progressRing, 
            { 
              borderColor: holdProgress.interpolate({
                inputRange: [0, 100],
                outputRange: ['rgba(220, 38, 38, 0)', 'rgba(220, 38, 38, 1)']
              })
            }
          ]} />

          <TouchableOpacity
            style={styles.sosButton}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.85}
            disabled={processing}
          >
            {processing ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <>
                <Text style={styles.sosLabel}>SOS</Text>
                <Text style={styles.sosHint}>{holding ? "HOLDING..." : "HOLD 3 SEC"}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.sosDesc}>
          Auto-routes to Highway Patrol or General Emergency (112) based on your location.
        </Text>

        <View style={styles.contactConfigCard}>
          <Text style={styles.contactConfigTitle}>Emergency Contact</Text>
          <Text style={styles.contactConfigSub}>
            SMS with live location is sent when SOS is triggered.
          </Text>
          
          <View style={[styles.inputRow, { marginBottom: 10 }]}>
            <Ionicons name="person" size={16} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.contactInput}
              placeholder="Contact Name"
              placeholderTextColor="#6B7280"
              value={emergencyName}
              onChangeText={setEmergencyName}
            />
          </View>
          
          <View style={styles.inputRow}>
            <Ionicons name="call" size={16} color="#6B7280" style={styles.inputIcon} />
            <TextInput
              style={styles.contactInput}
              placeholder="Phone Number"
              placeholderTextColor="#6B7280"
              keyboardType="phone-pad"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
            />
            <TouchableOpacity style={styles.contactSaveBtn} onPress={handleSaveContact}>
              <Text style={styles.contactSaveText}>
                {profile.emergencyContact ? 'Update' : 'Add'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* EMERGENCY CONTACTS GRID */}
        <View style={styles.emergencyGrid}>
          <TouchableOpacity style={styles.emergencyCard} onPress={() => call('100')}>
            <View style={[styles.emergencyIcon, { backgroundColor: '#1E3A5F' }]}>
              <Ionicons name="headset" size={22} color="#60A5FA" />
            </View>
            <Text style={styles.emergencyTitle}>Police</Text>
            <Text style={styles.emergencyNumber}>100</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyCard} onPress={() => call('108')}>
            <View style={[styles.emergencyIcon, { backgroundColor: '#14532D' }]}>
              <Ionicons name="medkit" size={22} color="#4ADE80" />
            </View>
            <Text style={styles.emergencyTitle}>Ambulance</Text>
            <Text style={styles.emergencyNumber}>108</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyCard} onPress={() => call('1033')}>
            <View style={[styles.emergencyIcon, { backgroundColor: '#7C2D12' }]}>
              <Ionicons name="construct" size={22} color="#FB923C" />
            </View>
            <Text style={styles.emergencyTitle}>Highway aid</Text>
            <Text style={styles.emergencyNumber}>1033</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.emergencyCard}>
            <View style={[styles.emergencyIcon, { backgroundColor: '#713F12' }]}>
              <Ionicons name="car" size={22} color="#FCD34D" />
            </View>
            <Text style={styles.emergencyTitle}>Towing</Text>
            <Text style={styles.emergencyNumber}>Find near</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111111' },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F1F1F',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  liveText: { fontSize: 11, fontWeight: '700', color: '#F87171' },

  // SOS Button
  sosSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    height: 180,
  },
  sosRipple: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(185, 28, 28, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosRippleInner: {
    width: 148,
    height: 148,
    borderRadius: 74,
    backgroundColor: 'rgba(185, 28, 28, 0.4)',
  },
  progressRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: 'transparent',
  },
  sosButton: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#B91C1C',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 12,
  },
  sosLabel: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
  },
  sosHint: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Description
  sosDesc: {
    textAlign: 'center',
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 28,
  },

  // Emergency Contact Configuration
  contactConfigCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  contactConfigTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  contactConfigSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    paddingHorizontal: 12,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  contactInput: {
    flex: 1,
    color: '#F9FAFB',
    fontSize: 14,
    height: '100%',
    padding: 0,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  contactSaveBtn: {
    backgroundColor: '#B91C1C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactSaveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Emergency Grid
  emergencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  emergencyCard: {
    width: '48%',
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2D2D2D',
  },
  emergencyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emergencyTitle: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },
  emergencyNumber: { fontSize: 13, color: '#9CA3AF' },
});

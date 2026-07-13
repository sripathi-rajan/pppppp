import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../hooks/useAuth';
import { getApiBaseUrl } from '../lib/api';

WebBrowser.maybeCompleteAuthSession();

const LOCAL_ACCOUNTS_KEY = '@drivelegal_local_accounts';

// Simple local credential store (fallback when backend is offline)
async function localRegister(name: string, email: string, password: string) {
  const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
  const accounts: Record<string, any> = raw ? JSON.parse(raw) : {};
  const key = email.toLowerCase();
  if (accounts[key]) throw new Error('Email already registered locally.');
  accounts[key] = { name, email: key, password };
  await AsyncStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function localLogin(email: string, password: string) {
  const raw = await AsyncStorage.getItem(LOCAL_ACCOUNTS_KEY);
  const accounts: Record<string, any> = raw ? JSON.parse(raw) : {};
  const key = email.toLowerCase();
  const acc = accounts[key];
  if (!acc) throw new Error('No account found with this email.');
  if (acc.password !== password) throw new Error('Incorrect password.');
  return acc;
}

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'];

export default function LoginScreen() {
  const router = useRouter();
  const { login: authLogin } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  
  // Profile Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [gender, setGender] = useState('Prefer not to say');

  // Google Profile Completion State
  const [isCompletingProfile, setIsCompletingProfile] = useState(false);
  const [googleData, setGoogleData] = useState<{name: string, email: string, googleId: string} | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');

  // GOOGLE SIGN IN SETUP
  const redirectUri = Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://drive-legal-tau.vercel.app/login')
    : AuthSession.makeRedirectUri({ path: 'login' });

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: '1069854491436-srkg98fnhte7jhpucig0hod8c4kuhpg5.apps.googleusercontent.com',
    androidClientId: '1069854491436-0mb2fsdo4na5j4tpc2l8i9b1hia3359r.apps.googleusercontent.com',
    iosClientId: '1069854491436-2ck9gm0qud42fami59rtslgub2uii2j5.apps.googleusercontent.com',
    redirectUri: redirectUri,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleLoginSuccess(authentication?.accessToken);
    } else if (response?.type === 'error') {
      setFormError(`Google Sign-In Error: ${response.error?.message || 'Unknown error'}`);
    }
  }, [response]);

  // Handle Google OAuth implicit-flow callback on web (access_token in URL hash)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (!hash) return;
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const accessToken = params.get('access_token');
    if (accessToken) {
      // Clean the URL hash so it doesn't re-trigger on next render
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      handleGoogleLoginSuccess(accessToken);
    }
  }, []);

  const handleGoogleLoginSuccess = async (accessToken?: string) => {
    if (!accessToken) return;
    setIsLoading(true);
    setFormError('');
    try {
      const baseUrl = getApiBaseUrl();

      // The server verifies accessToken directly with Google and derives the
      // identity itself — the client no longer self-reports email/name/googleId.
      const res = await fetch(`${baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.message || 'Google Login Failed on Server');
      
      if (data.require_profile_completion) {
         setGoogleData(data.googleProfile);
         setName(data.googleProfile.name);
         setEmail(data.googleProfile.email);
         setIsCompletingProfile(true);
         setIsLoading(false);
         return; // Wait for user to complete profile
      }

      const token = data.access_token;
      if (!token) throw new Error('Server returned no token.');
      
      const meRes = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await meRes.json().catch(() => ({}));
      if (!meRes.ok) throw new Error(userData.detail || 'Profile fetch failed');
      
      await authLogin(token, userData);
      // Navigation is handled by the auth guard in _layout.tsx
      
    } catch (err: any) {
      console.error('[Google Login] Error:', err);
      setFormError(err.message || 'Google login failed.');
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      const token = `demo_${Date.now()}`;
      const userData = {
        _id: 999999,
        name: 'User',
        email: 'demo@drivelegal.in',
        phone: '9876543210',
        vehicles: [],
        createdAt: new Date().toISOString(),
      };
      await authLogin(token, userData);
      // Navigation is handled by the auth guard in _layout.tsx
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setIsCompletingProfile(false);
    setFormError('');
    setPasswordError('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
    setPhone('');
    setVehicleNumber('');
    setGender('Prefer not to say');
  };

  const handleAuth = async () => {
    setFormError('');
    
    if (isCompletingProfile) {
      if (!phone.trim()) { setFormError('Please enter your phone number.'); return; }
    } else {
      if (!email.trim()) { setFormError('Please enter your email.'); return; }
      if (!password) { setFormError('Please enter your password.'); return; }
      if (!isLogin) {
        if (!name.trim()) { setFormError('Please enter your full name.'); return; }
        if (!phone.trim()) { setFormError('Please enter your phone number.'); return; }
        if (password !== confirmPassword) {
          setPasswordError('Passwords do not match');
          return;
        }
      }
    }

    setPasswordError('');
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const baseUrl = getApiBaseUrl();

    try {
      let token: string | null = null;
      let userData: any = null;
      let useLocalFallback = false;

      try {
        if (isCompletingProfile && googleData) {
           // Google Profile Completion
           let compRes;
           try {
             compRes = await fetch(`${baseUrl}/api/auth/complete-profile`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 name: googleData.name,
                 email: googleData.email,
                 googleId: googleData.googleId,
                 phone: phone.trim(),
                 gender,
                 vehicleNumber: vehicleNumber.trim() || null
               }),
             });
           } catch (netErr) {
             useLocalFallback = true;
             throw new Error('NETWORK_ERROR');
           }
           const compData = await compRes.json().catch(() => ({}));
           if (!compRes.ok) throw new Error(compData.detail || compData.message || `Profile completion failed`);
           
           token = compData.access_token;
        } else if (!isLogin) {
          // Local Register
          let regRes;
          try {
            regRes = await fetch(`${baseUrl}/api/auth/register`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: name.trim(),
                email: trimmedEmail,
                password,
                phone: phone.trim(),
                gender,
                vehicleNumber: vehicleNumber.trim() || null,
                vehicles: [],
              }),
            });
          } catch (netErr) {
            useLocalFallback = true;
            throw new Error('NETWORK_ERROR');
          }
          const regData = await regRes.json().catch(() => ({}));
          if (!regRes.ok) throw new Error(regData.detail || regData.message || `Registration failed`);
          
          token = regData.access_token;
        } else {
          // Local Login
          let loginRes;
          try {
            loginRes = await fetch(`${baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: trimmedEmail, password }),
            });
          } catch (netErr) {
            useLocalFallback = true;
            throw new Error('NETWORK_ERROR');
          }
          const loginData = await loginRes.json().catch(() => ({}));
          if (!loginRes.ok) throw new Error(loginData.detail || loginData.message || `Login failed`);
          
          token = loginData.access_token;
        }

        if (!useLocalFallback && token) {
          // Fetch user profile
          let meRes;
          try {
            meRes = await fetch(`${baseUrl}/api/auth/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
          } catch (netErr) {
            useLocalFallback = true;
            throw new Error('NETWORK_ERROR');
          }
          userData = await meRes.json().catch(() => ({}));
          if (!meRes.ok) throw new Error(userData.detail || 'Profile fetch failed');
        }
      } catch (backendErr: any) {
        if (backendErr.message !== 'NETWORK_ERROR') {
          throw backendErr;
        }
      }

      if (useLocalFallback) {
        console.warn('[Login] Backend unavailable, using local fallback');
        if (!isLogin && !isCompletingProfile) {
          await localRegister(name.trim(), trimmedEmail, password);
        }
        if (!isCompletingProfile) {
          const localUser = await localLogin(trimmedEmail, password);
          token = `local_${Date.now()}`;
          userData = {
            _id: trimmedEmail,
            name: localUser.name,
            email: localUser.email,
            phone: phone || '',
            vehicles: [],
            createdAt: new Date().toISOString(),
          };
        } else {
           throw new Error("Cannot complete profile offline");
        }
      }

      await authLogin(token!, userData);
      // Navigation is handled by the auth guard in _layout.tsx
    } catch (err: any) {
      console.error('[Login] Error:', err);
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={handleDemoLogin}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="flash" size={14} color="#6b7280" />
          <Text style={styles.headerButtonText}>Demo Login</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.headerButton} 
          onPress={() => {
            const url = `${getApiBaseUrl()}/admin`;
            if (Platform.OS === 'web') {
              window.open(url, '_blank');
            } else {
              WebBrowser.openBrowserAsync(url);
            }
          }}
          disabled={isLoading}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={14} color="#6b7280" />
          <Text style={styles.headerButtonText}>Admin</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>DL</Text>
            </View>
            <Text style={styles.logoText}>DriveLegal</Text>
          </View>

          {/* Heading */}
          <Text style={styles.title}>
            {isCompletingProfile ? 'Complete Profile' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </Text>
          <Text style={styles.subtitle}>
            {isCompletingProfile ? 'Just a few more details to get started' : (isLogin ? 'Log in to continue to DriveLegal' : 'Sign up to get started')}
          </Text>

          {!isCompletingProfile && (
            <>
              {/* Google Button */}
              <TouchableOpacity
                style={styles.googleButton}
                onPress={() => promptAsync()}
                disabled={!request || isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" style={{ marginRight: 10 }} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>
            </>
          )}

          {/* Inline error */}
          {!!formError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={16} color="#dc2626" />
              <Text style={styles.errorBannerText}>{formError}</Text>
            </View>
          )}

          {/* Name */}
          {(!isLogin || isCompletingProfile) && (
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={(t) => { setName(t); setFormError(''); }}
                autoCapitalize="words"
                returnKeyType="next"
                editable={!isCompletingProfile} // Disable if from Google
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={(t) => { setEmail(t); setFormError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
              editable={!isCompletingProfile} // Disable if from Google
            />
          </View>

          {/* Phone */}
          {(!isLogin || isCompletingProfile) && (
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                placeholderTextColor="#9ca3af"
                value={phone}
                onChangeText={(t) => { setPhone(t); setFormError(''); }}
                keyboardType="phone-pad"
                returnKeyType="next"
              />
            </View>
          )}

          {/* Vehicle Number (Optional) */}
          {(!isLogin || isCompletingProfile) && (
            <View style={styles.inputWrapper}>
              <Ionicons name="car-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Vehicle Number (Optional)"
                placeholderTextColor="#9ca3af"
                value={vehicleNumber}
                onChangeText={(t) => { setVehicleNumber(t); setFormError(''); }}
                autoCapitalize="characters"
                returnKeyType="next"
              />
            </View>
          )}

          {/* Gender */}
          {(!isLogin || isCompletingProfile) && (
            <View style={styles.genderContainer}>
              <Text style={styles.genderLabel}>Gender</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genderScroll}>
                {GENDER_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.genderChip, gender === opt && styles.genderChipActive]}
                    onPress={() => setGender(opt)}
                  >
                    <Text style={[styles.genderChipText, gender === opt && styles.genderChipTextActive]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Password */}
          {!isCompletingProfile && (
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(t) => { setPassword(t); setFormError(''); }}
                secureTextEntry
                returnKeyType={isLogin ? 'done' : 'next'}
                onSubmitEditing={isLogin ? handleAuth : undefined}
              />
            </View>
          )}

          {/* Confirm Password (sign-up only) */}
          {(!isLogin && !isCompletingProfile) && (
            <>
              <View style={[styles.inputWrapper, !!passwordError && styles.inputWrapperError]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={passwordError ? '#dc2626' : '#9ca3af'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setPasswordError(''); }}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
              </View>
              {!!passwordError && (
                <Text style={styles.fieldError}>{passwordError}</Text>
              )}
            </>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
            onPress={handleAuth}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {isCompletingProfile ? 'Complete Registration' : (isLogin ? 'Log In' : 'Sign Up')}
              </Text>
            )}
          </TouchableOpacity>

          {/* Toggle login/signup */}
          {!isCompletingProfile && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>
                {isLogin ? "Don't have an account?  " : 'Already have an account?  '}
              </Text>
              <TouchableOpacity onPress={switchMode} activeOpacity={0.7}>
                <Text style={styles.toggleLink}>
                  {isLogin ? 'Sign up' : 'Log in'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' }, // Deep modern dark blue
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 80,
    justifyContent: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#38BDF8', // Bright blue accent
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoIconText: { color: '#0F172A', fontWeight: '800', fontSize: 16 },
  logoText: { fontSize: 24, fontWeight: '700', color: '#F8FAFC', letterSpacing: -0.5 },

  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },

  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#F8FAFC' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  divider: { flex: 1, height: 1, backgroundColor: '#334155' },
  dividerText: { marginHorizontal: 16, color: '#64748B', fontSize: 14 },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    gap: 10,
  },
  errorBannerText: { flex: 1, color: '#FCA5A5', fontSize: 14 },

  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  inputWrapperError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, color: '#F8FAFC' },
  fieldError: {
    color: '#EF4444',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 14,
    marginLeft: 4,
  },
  
  genderContainer: {
    marginBottom: 16,
  },
  genderLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 10,
    marginLeft: 4,
    fontWeight: '500'
  },
  genderScroll: {
    gap: 10,
    paddingBottom: 4
  },
  genderChip: {
    backgroundColor: '#1E293B',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  genderChipActive: {
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
  },
  genderChipText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '500',
  },
  genderChipTextActive: {
    color: '#38BDF8',
  },

  primaryButton: {
    backgroundColor: '#38BDF8',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 26,
    minHeight: 56,
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#0F172A', fontSize: 17, fontWeight: '700' },

  toggleRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  toggleText: { color: '#94A3B8', fontSize: 15 },
  toggleLink: { color: '#38BDF8', fontSize: 15, fontWeight: '700' },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  headerButtonText: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

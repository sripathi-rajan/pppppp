import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '../../../hooks/useSettings';
import * as ImagePicker from 'expo-image-picker';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

const MOCK_NAMES = ['Aarav Sharma', 'Vivaan Patel', 'Diya Singh', 'Neha Gupta', 'Rahul Verma', 'Kamlesh Kumar', 'Rakesh Behera'];
const MOCK_RTOS = ['RTO TAMBARAM, TN', 'RTO DELHI, DL', 'RTO MUMBAI, MH', 'RTO BENGALURU, KA', 'RTO CHENNAI SOUTH, TN'];
const MOCK_EXPIRIES = ['13-12-2037', '24-08-2030', '15-05-2042', '01-01-2035', '18-11-2039', '20-04-2026'];
const MOCK_MODELS = ['Hyundai i20', 'Honda City', 'Maruti Swift', 'Kia Seltos', 'Tata Nexon', 'Royal Enfield'];
const MOCK_DOBS = ['04-01-1988', '12-05-1992', '23-11-1985', '09-08-1995'];
const MOCK_BLOOD = ['B+', 'O+', 'A+', 'AB+'];
const MOCK_ADDRESSES = ['7th Block, Temple Town St, Chennai', 'Flat 402, Green Park, Delhi', 'Villa 12, Palm Meadows, Bengaluru'];
const MOCK_FUELS = ['PETROL', 'DIESEL', 'CNG', 'EV'];
const MOCK_EMISSIONS = ['BHARAT STAGE III', 'BHARAT STAGE IV', 'BHARAT STAGE VI'];
const MOCK_FATHERS = ['Rameshwar Lal', 'Suresh Patel', 'Ashok Singh', 'Vijay Verma'];

const getRandomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];

interface RCDoc {
  id: string;
  vehicleNumber: string;
  vehicleModel: string;
  ownerName: string;
  fathersName: string;
  expiryDate: string;
  registrationDate: string;
  chassisNumber: string;
  engineNumber: string;
  fuelType: string;
  emissionNorms: string;
  address: string;
}

interface InsuranceDoc {
  id: string;
  policyNo: string;
  provider: string;
  insuredName: string;
  period: string;
  expiry: string;
  idv: string;
  vehicleModel: string;
}

interface PUCDoc {
  id: string;
  certNo: string;
  regNo: string;
  fuelType: string;
  emissionNorms: string;
  lastTestValue: string;
  expiry: string;
  reminderSet: boolean;
}

interface FasTagDoc {
  id: string;
  tagId: string;
  balance: number | null;
  checkingBalance: boolean;
  rechargeAmount: string;
  recharging: boolean;
  rechargeSuccess: boolean;
}

const DetailItem = ({ label, value }: { label: string, value: string }) => (
  <View style={{ width: '45%', marginBottom: 12, flexShrink: 1 }}>
    <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600', flexShrink: 1 }}>{label}</Text>
    <Text style={{ fontSize: 12, color: '#1F2937', marginTop: 2, fontWeight: '500', flexShrink: 1 }}>{value || '---'}</Text>
  </View>
);

export default function DocumentVaultScreen() {
  const router = useRouter();
  const { profile, t } = useSettings();

  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [ocrLoadingDoc, setOcrLoadingDoc] = useState<string | null>(null);

  const [toast, setToast] = useState<{title: string, message: string} | null>(null);
  
  const showToast = (title: string, message: string) => {
    setToast({title, message});
    setTimeout(() => setToast(null), 3000);
  };

  // Editable Document States (Pre-filled or populated by OCR)
  const [dlNumber, setDlNumber] = useState('');
  const [dlHolder, setDlHolder] = useState('');
  const [dlFathersName, setDlFathersName] = useState('');
  const [dlDob, setDlDob] = useState('');
  const [dlBloodGroup, setDlBloodGroup] = useState('');
  const [dlIssueDate, setDlIssueDate] = useState('');
  const [dlExpiry, setDlExpiry] = useState('');
  const [dlClass, setDlClass] = useState('');
  const [dlIssuingAuthority, setDlIssuingAuthority] = useState('');
  const [dlAddress, setDlAddress] = useState('');

  const [rcDocs, setRcDocs] = useState<RCDoc[]>([{
    id: 'rc_manual',
    vehicleNumber: '',
    vehicleModel: '',
    ownerName: '',
    fathersName: '',
    expiryDate: '',
    registrationDate: '',
    chassisNumber: '',
    engineNumber: '',
    fuelType: '',
    emissionNorms: '',
    address: '',
  }]);

  const [insDocs, setInsDocs] = useState<InsuranceDoc[]>([{
    id: 'ins_manual',
    policyNo: '', provider: '', insuredName: '', period: '', expiry: '', idv: '', vehicleModel: ''
  }]);

  const [pucDocs, setPucDocs] = useState<PUCDoc[]>([{
    id: 'puc_manual',
    certNo: '', regNo: '', fuelType: '', emissionNorms: '', lastTestValue: '', expiry: '', reminderSet: false
  }]);

  const [fastagDocs, setFastagDocs] = useState<FasTagDoc[]>([{ id: 'fastag_1', tagId: '', balance: null, checkingBalance: false, rechargeAmount: '', recharging: false, rechargeSuccess: false }]);
  const [pucReminderSet, setPucReminderSet] = useState(false);
  const toggleExpand = (docName: string) => {
    setExpandedDoc(expandedDoc === docName ? null : docName);
  };

  const handleDocumentUpload = async (docType: string, docId?: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'DriveLegal needs photo library access to upload documents.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.6,
    });
    
    if (result.canceled || !result.assets[0]?.uri) return;
    
    setOcrLoadingDoc(docType);
    
    // Simulate 1.5s OCR extraction
    setTimeout(() => {
      setOcrLoadingDoc(null);
      
      if (docType === 'DL') {
        setDlNumber(`TN11 ${Math.floor(2000 + Math.random() * 20)} ${Math.floor(1000000 + Math.random() * 9000000)}`);
        setDlHolder(profile.name || getRandomItem(MOCK_NAMES));
        setDlFathersName(getRandomItem(MOCK_FATHERS));
        setDlDob(getRandomItem(MOCK_DOBS));
        setDlBloodGroup(getRandomItem(MOCK_BLOOD));
        setDlIssueDate('14-12-2017');
        setDlExpiry(getRandomItem(MOCK_EXPIRIES));
        setDlClass(Math.random() > 0.5 ? 'MCWG, LMV' : 'LMV');
        setDlIssuingAuthority(getRandomItem(MOCK_RTOS));
        setDlAddress(getRandomItem(MOCK_ADDRESSES));
        setExpandedDoc('DL');
        Alert.alert('OCR Extraction Success', 'Extracted details from Driving License successfully!');
      } 
      else if (docType === 'RC') {
        const targetId = docId || `rc_${Date.now()}`;
        setRcDocs(prev => {
          const activeCount = prev.filter(r => r.vehicleNumber).length;
          const ownerName = activeCount === 0 
            ? (profile.name || getRandomItem(MOCK_NAMES)) 
            : (profile.name ? `${profile.name} (Vehicle ${activeCount + 1})` : getRandomItem(MOCK_NAMES));
            
          const extracted: RCDoc = {
            id: targetId,
            vehicleNumber: `DL6SAG${Math.floor(1000 + Math.random() * 9000)}`,
            vehicleModel: getRandomItem(MOCK_MODELS),
            ownerName,
            fathersName: getRandomItem(MOCK_FATHERS),
            expiryDate: getRandomItem(MOCK_EXPIRIES),
            registrationDate: '21-04-2011',
            chassisNumber: `MBLMC38ECBGC${Math.floor(10000 + Math.random() * 90000)}`,
            engineNumber: `MC38EBBGC${Math.floor(10000 + Math.random() * 90000)}`,
            fuelType: getRandomItem(MOCK_FUELS),
            emissionNorms: getRandomItem(MOCK_EMISSIONS),
            address: getRandomItem(MOCK_ADDRESSES),
          };
          
          if (docId) {
             return prev.map(p => p.id === docId ? extracted : p);
          }
          if (prev.length === 1 && !prev[0].vehicleNumber) {
            return [extracted];
          }
          return [...prev, extracted];
        });
        setExpandedDoc('RC');
        Alert.alert('OCR Extraction Success', 'Extracted details from RC Book successfully!');
      }
      else if (docType === 'Insurance') {
        const targetId = docId || `ins_${Date.now()}`;
        setInsDocs(prev => {
          const extracted: InsuranceDoc = {
            id: targetId,
            policyNo: `3005/W-${Math.floor(1000000 + Math.random() * 9000000)}/00/000`,
            provider: 'ICICI Lombard General Insurance',
            insuredName: profile.name || getRandomItem(MOCK_NAMES),
            period: '25-Aug-2010 to 24-Aug-2011',
            expiry: '24-Aug-2011',
            idv: '₹46,785',
            vehicleModel: getRandomItem(MOCK_MODELS),
          };
          if (docId) return prev.map(p => p.id === docId ? extracted : p);
          if (prev.length === 1 && !prev[0].policyNo) return [extracted];
          return [...prev, extracted];
        });
        setExpandedDoc('Insurance');
        Alert.alert('OCR Extraction Success', 'Extracted details from Insurance Policy successfully!');
      }
      else if (docType === 'PUC') {
        const targetId = docId || `puc_${Date.now()}`;
        setPucDocs(prev => {
          const extracted: PUCDoc = {
            id: targetId,
            certNo: `UP0340021000${Math.floor(1000 + Math.random() * 9000)}`,
            regNo: `UP 34 T ${Math.floor(1000 + Math.random() * 9000)}`,
            fuelType: 'DIESEL',
            emissionNorms: 'Bharat (Trem) Stage III A',
            lastTestValue: '0.54 1/metre',
            expiry: '06/11/2023',
            reminderSet: false
          };
          if (docId) return prev.map(p => p.id === docId ? extracted : p);
          if (prev.length === 1 && !prev[0].certNo) return [extracted];
          return [...prev, extracted];
        });
        setExpandedDoc('PUC');
        Alert.alert('OCR Extraction Success', 'Extracted details from PUC Certificate successfully!');
      }
      else if (docType === 'FasTag') {
        const targetId = docId || `fastag_${Date.now()}`;
        setFastagDocs(prev => {
          const extracted: FasTagDoc = {
            id: targetId,
            tagId: 'FTG9900223388',
            balance: 420,
            checkingBalance: false,
            rechargeAmount: '',
            recharging: false,
            rechargeSuccess: false
          };
          if (docId) return prev.map(p => p.id === docId ? extracted : p);
          if (prev.length === 1 && !prev[0].tagId) return [extracted];
          return [...prev, extracted];
        });
        setExpandedDoc('FasTag');
        Alert.alert('OCR Extraction Success', 'Extracted FasTag ID successfully!');
      }
    }, 1500);
  };

  const handleFasTagCheckBalance = (idx: number) => {
    setFastagDocs(prev => {
      const next = [...prev];
      next[idx].checkingBalance = true;
      return next;
    });
    setTimeout(() => {
      setFastagDocs(prev => {
        const next = [...prev];
        next[idx].balance = 420;
        next[idx].checkingBalance = false;
        return next;
      });
      showToast('FasTag Wallet Balance', 'Your linked HDFC FasTag balance is ₹420.');
    }, 1000);
  };

  const handleFasTagRecharge = (idx: number) => {
    setFastagDocs(prev => {
      const next = [...prev];
      const amt = Number(next[idx].rechargeAmount.trim());
      if (isNaN(amt) || amt <= 0) {
        showToast('Invalid Amount', 'Please enter a valid amount to recharge.');
        return next;
      }
      next[idx].recharging = true;
      return next;
    });
    setTimeout(() => {
      setFastagDocs(prev => {
        const next = [...prev];
        const amt = Number(next[idx].rechargeAmount.trim());
        if (isNaN(amt) || amt <= 0) return next;
        
        next[idx].balance = (next[idx].balance || 420) + amt;
        next[idx].recharging = false;
        next[idx].rechargeSuccess = true;
        
        setTimeout(() => {
          setFastagDocs(current => {
            const nextCurrent = [...current];
            if (nextCurrent[idx]) {
              nextCurrent[idx].rechargeSuccess = false;
              nextCurrent[idx].rechargeAmount = '';
            }
            return nextCurrent;
          });
        }, 2000);

        showToast('Recharge Successful', `₹${amt} has been recharged.`);
        return next;
      });
    }, 1200);
  };

  const handleSetPUCReminder = () => {
    setPucReminderSet(!pucReminderSet);
    Alert.alert(
      pucReminderSet ? 'Reminder Cleared' : 'Reminder Scheduled',
      pucReminderSet 
        ? 'Renewal reminders for PUC certificate have been cleared.'
        : 'Scheduled renewal reminders! We will alert you 7 days before expiry.'
    );
  };

  const handleFindEmissionCenter = () => {
    Alert.alert(
      'Emission Center Lookup',
      'Searching for nearby certified emission test sheds on the map...',
      [
        {
          text: 'Open Map Filters',
          onPress: () => router.push({ pathname: '/(tabs)/map', params: { poiFilter: 'Mechanic Sheds' } })
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const MiniQR = () => (
    <View style={styles.qrContainer}>
      {[...Array(6)].map((_, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 3 }}>
          {[...Array(6)].map((__, j) => {
            const isCorner = (i < 2 && j < 2) || (i < 2 && j >= 4) || (i >= 4 && j < 2);
            const opacity = isCorner ? 1 : Math.random() > 0.4 ? 1 : 0.15;
            return (
              <View 
                key={j} 
                style={[
                  styles.miniQrDot, 
                  { 
                    backgroundColor: isCorner ? '#0369A1' : '#1F2937', 
                    opacity 
                  }
                ]} 
              />
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {toast && (
        <View style={{ position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#059669', padding: 16, borderRadius: 12, zIndex: 9999, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: {width: 0, height: 4}, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, ...Platform.select({ web: { position: 'fixed' as any } }) }}>
          <Ionicons name="checkmark-circle" size={28} color="#fff" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15, marginBottom: 2 }}>{toast.title}</Text>
            <Text style={{ color: '#fff', fontSize: 13, opacity: 0.9 }}>{toast.message}</Text>
          </View>
          <TouchableOpacity onPress={() => setToast(null)} style={{ padding: 4 }}>
            <Ionicons name="close" size={20} color="#fff" style={{ opacity: 0.7 }} />
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('vault_title')}</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => Alert.alert(t('add_document'), 'Select standard upload or pick category to extract via OCR.')}
          >
            <Text style={styles.addButtonText}>+ {t('add')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* DRIVING LICENSE CARD (PINNED AT THE VERY TOP) */}
          <View style={styles.licenseCardContainer}>
            <ErrorBoundary fallbackTitle="Driving License Card">
              <View style={[styles.licenseCard, expandedDoc === 'DL' && styles.licenseCardActive, { position: 'relative', padding: 0 }]}>
                {/* Main Card Touchable Area */}
                <TouchableOpacity 
                  style={{ padding: 20 }}
                  onPress={() => toggleExpand('DL')}
                  activeOpacity={0.95}
                >
                  {/* Top Row (Left part only to avoid overlapping sibling touchable) */}
                  <View style={[styles.licenseTopRow, { paddingRight: 100 }]}>
                    <View>
                      <Text style={styles.licenseType}>{t('driving_license')}</Text>
                      <Text style={styles.licenseCountry}>{profile.country || 'India'} - {profile.state || 'Tamil Nadu'}</Text>
                    </View>
                  </View>

                  {/* License Number */}
                  <Text style={styles.licenseNumber}>{dlNumber || 'NOT UPLOADED'}</Text>

                  {/* Bottom Row */}
                  <View style={styles.licenseBottomRow}>
                    <View>
                      <Text style={styles.licenseFieldLabel}>{t('holder')}</Text>
                      <Text style={styles.licenseFieldValue}>{dlHolder || '---'}</Text>
                    </View>
                    <View>
                      <Text style={styles.licenseFieldLabel}>{t('valid_till')}</Text>
                      <Text style={styles.licenseFieldValue}>{dlExpiry || '---'}</Text>
                    </View>
                    {/* QR Code placeholder */}
                    <View style={styles.qrPlaceholder}>
                      {[...Array(4)].map((_, i) => (
                        <View key={i} style={styles.qrRow}>
                          {[...Array(4)].map((__, j) => (
                            <View
                              key={j}
                              style={[
                                styles.qrDot,
                                { opacity: Math.random() > 0.4 ? 1 : 0.2 },
                              ]}
                            />
                          ))}
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Verified Badge (Absolute Positioned) */}
                {dlNumber ? (
                  <View style={[styles.headerRightActionRow, { position: 'absolute', top: 20, right: 20, zIndex: 10 }]}>
                    <View style={styles.verifiedBadge}>
                      <Ionicons name="checkmark" size={12} color="#4ADE80" />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            </ErrorBoundary>

            {/* DL OCR Loader overlay if active */}
            {ocrLoadingDoc === 'DL' && (
              <View style={styles.ocrLoaderOverlay}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.ocrLoaderText}>Extracting details...</Text>
              </View>
            )}

            {/* DL Expandable Actions & Editable Inputs */}
            {expandedDoc === 'DL' && (
              <View style={styles.expandedLicContent}>
                <View style={styles.editableFieldsCard}>
                  <Text style={styles.editCardTitle}>{t('verify_extracted_dl')}</Text>
                  <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>Enter details manually or tap the camera icon to scan your document.</Text>
                  
                  <View style={styles.editInputGroup}>
                    <Text style={styles.editInputLabel}>{t('license_number')}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.editTextInput, { flex: 1, marginRight: 10, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', borderColor: (dlNumber && !/^[A-Z]{2}\d{13}$/i.test(dlNumber.replace(/[\s-]/g, ''))) ? '#EF4444' : '#E5E7EB', borderWidth: 1 }]}>
                        <TextInput 
                          style={{ flex: 1, paddingHorizontal: 8, height: '100%', fontSize: 12, fontWeight: '600', color: '#1F2937', ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any) }}
                          value={dlNumber}
                          onChangeText={setDlNumber}
                          placeholder="EX: TN11 2017 0015319"
                          placeholderTextColor="#9CA3AF"
                        />
                        <TouchableOpacity 
                          style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
                          onPress={() => handleDocumentUpload('DL')}
                        >
                          <Ionicons name="camera-outline" size={16} color="#D97706" />
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity 
                        style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                        onPress={() => {
                          if (!dlNumber) return;
                          if (!/^[A-Z]{2}\d{13}$/i.test(dlNumber.replace(/[\s-]/g, ''))) return;

                          Alert.alert('Verification Success', 'License details verified.');
                          setDlHolder(profile.name || getRandomItem(MOCK_NAMES));
                          setDlFathersName(getRandomItem(MOCK_FATHERS));
                          setDlDob(getRandomItem(MOCK_DOBS));
                          setDlBloodGroup(getRandomItem(MOCK_BLOOD));
                          setDlIssueDate('14-12-2017');
                          setDlExpiry(getRandomItem(MOCK_EXPIRIES));
                          setDlClass(Math.random() > 0.5 ? 'MCWG, LMV' : 'LMV');
                          setDlIssuingAuthority(getRandomItem(MOCK_RTOS));
                          setDlAddress(getRandomItem(MOCK_ADDRESSES));
                        }}
                      >
                        <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                      </TouchableOpacity>
                    </View>
                    {dlNumber !== '' && !/^[A-Z]{2}\d{13}$/i.test(dlNumber.replace(/[\s-]/g, '')) && (
                      <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Warning: Enter a valid 15-character Indian Driving License Number</Text>
                    )}
                  </View>

                  {dlHolder ? (
                    <View style={{ marginTop: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10 }}>{t('extracted_details')}</Text>
                      
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        <DetailItem label={t('holder_name')} value={dlHolder} />
                        <DetailItem label={t('fathers_name')} value={dlFathersName} />
                        <DetailItem label={t('dob')} value={dlDob} />
                        <DetailItem label={t('blood_group')} value={dlBloodGroup} />
                        <DetailItem label={t('issue_date')} value={dlIssueDate} />
                        <DetailItem label={t('validity')} value={dlExpiry} />
                        <DetailItem label={t('vehicle_class')} value={dlClass} />
                        <DetailItem label={t('authority')} value={dlIssuingAuthority} />
                      </View>
                      <View style={{ marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>ADDRESS</Text>
                        <Text style={{ fontSize: 12, color: '#1F2937', marginTop: 2 }}>{dlAddress}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>

                <View style={styles.actionButtonRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtnOutline, { borderColor: '#FECACA', backgroundColor: '#FEF2F2' }]} 
                    onPress={() => {
                      setDlNumber(''); setDlHolder(''); setDlExpiry(''); setDlClass(''); setDlIssuingAuthority('');
                      setDlFathersName(''); setDlDob(''); setDlBloodGroup(''); setDlIssueDate(''); setDlAddress('');
                      Alert.alert('Removed', 'License details cleared.');
                    }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>{t('remove')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnSolid} onPress={() => showToast('Saved', 'License details updated.')}>
                    <Text style={styles.actionBtnTextWhite}>{t('save_changes')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* OTHER DOCUMENTS */}
          <Text style={styles.sectionTitle}>{t('other_documents')}</Text>

          <View style={styles.docList}>

            {/* Vehicle RC (Array of multiple vehicles) */}
            <ErrorBoundary fallbackTitle="Vehicle RC Card">
              <DocItem
                icon="document-outline"
                iconBg="#DCFCE7"
                iconColor="#15803D"
                title={t('vehicle_rc')}
                subtitle={rcDocs[0]?.vehicleNumber !== '' ? `${rcDocs.length} Vehicle${rcDocs.length > 1 ? 's' : ''} saved` : t('pending_upload')}
                status={rcDocs[0]?.vehicleNumber !== '' ? `${t('active')} · Expiry ${rcDocs[0]?.expiryDate || 'N/A'}` : t('missing_document')}
                statusColor={rcDocs[0]?.vehicleNumber !== '' ? "#16A34A" : "#EF4444"}
                isExpanded={expandedDoc === 'RC'}
                onPress={() => toggleExpand('RC')}
                onUpload={() => handleDocumentUpload('RC')}
                docType="RC"
                ocrLoadingDoc={ocrLoadingDoc}
              >
                <View style={styles.expandedDocContent}>
                  {rcDocs.map((rc, idx) => (
                    <View key={rc.id} style={[styles.editableFieldsCard, { marginBottom: 16 }]}>
                      <Text style={styles.editCardTitle}>Vehicle RC #{idx + 1} ({rc.vehicleNumber})</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>Enter details manually or tap the camera icon to scan your document.</Text>
                      
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>VEHICLE NUMBER</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.editTextInput, { flex: 1, marginRight: 10, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', borderColor: (rc.vehicleNumber && !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/i.test(rc.vehicleNumber.replace(/[\s-]/g, ''))) ? '#EF4444' : '#E5E7EB', borderWidth: 1 }]}>
                            <TextInput 
                              style={{ flex: 1, paddingHorizontal: 8, height: '100%', fontSize: 12, fontWeight: '600', color: '#1F2937', ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any) }}
                              value={rc.vehicleNumber}
                              onChangeText={(val) => {
                                const updated = [...rcDocs];
                                updated[idx].vehicleNumber = val;
                                setRcDocs(updated);
                              }}
                              placeholder="EX: DL6SAG2552"
                              placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
                              onPress={() => handleDocumentUpload('RC', rc.id)}
                            >
                              <Ionicons name="camera-outline" size={16} color="#D97706" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                            onPress={() => {
                              if (!rc.vehicleNumber) return;
                              if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/i.test(rc.vehicleNumber.replace(/[\s-]/g, ''))) return;
                              
                              Alert.alert('Verification Success', 'Vehicle details verified.');
                              const updated = [...rcDocs];
                              updated[idx].vehicleModel = getRandomItem(MOCK_MODELS);
                              updated[idx].ownerName = idx === 0 
                                ? (profile.name || getRandomItem(MOCK_NAMES)) 
                                : (profile.name ? `${profile.name} (Vehicle ${idx + 1})` : getRandomItem(MOCK_NAMES));
                              updated[idx].fathersName = getRandomItem(MOCK_FATHERS);
                              updated[idx].expiryDate = getRandomItem(MOCK_EXPIRIES);
                              updated[idx].registrationDate = '21-04-2011';
                              updated[idx].chassisNumber = `MBLMC38ECBGC${Math.floor(10000 + Math.random() * 90000)}`;
                              updated[idx].engineNumber = `MC38EBBGC${Math.floor(10000 + Math.random() * 90000)}`;
                              updated[idx].fuelType = getRandomItem(MOCK_FUELS);
                              updated[idx].emissionNorms = getRandomItem(MOCK_EMISSIONS);
                              updated[idx].address = getRandomItem(MOCK_ADDRESSES);
                              setRcDocs(updated);
                            }}
                          >
                            <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                        {rc.vehicleNumber !== '' && !/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{1,4}$/i.test(rc.vehicleNumber.replace(/[\s-]/g, '')) && (
                          <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Warning: Enter a valid Vehicle Registration Number</Text>
                        )}
                      </View>

                      {rc.ownerName ? (
                        <View style={{ marginTop: 16, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10 }}>EXTRACTED REGISTRY DETAILS</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            <DetailItem label="OWNER NAME" value={rc.ownerName} />
                            <DetailItem label="S/W/D OF" value={rc.fathersName} />
                            <DetailItem label="MAKE / MODEL" value={rc.vehicleModel} />
                            <DetailItem label="FUEL TYPE" value={rc.fuelType} />
                            <DetailItem label="REGN DATE" value={rc.registrationDate} />
                            <DetailItem label="VALIDITY" value={rc.expiryDate} />
                            <DetailItem label="CHASSIS NO" value={rc.chassisNumber} />
                            <DetailItem label="ENGINE NO" value={rc.engineNumber} />
                            <DetailItem label="EMISSION NORMS" value={rc.emissionNorms} />
                          </View>
                          <View style={{ marginTop: 4 }}>
                            <Text style={{ fontSize: 10, color: '#6B7280', fontWeight: '600' }}>ADDRESS</Text>
                            <Text style={{ fontSize: 12, color: '#1F2937', marginTop: 2 }}>{rc.address}</Text>
                          </View>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                          onPress={() => {
                            if (rcDocs.length > 1) {
                              setRcDocs(prev => prev.filter(r => r.id !== rc.id));
                            } else {
                              const updated = [...rcDocs];
                              updated[idx] = { id: rc.id, vehicleNumber: '', vehicleModel: '', ownerName: '', fathersName: '', expiryDate: '', registrationDate: '', chassisNumber: '', engineNumber: '', fuelType: '', emissionNorms: '', address: '' };
                              setRcDocs(updated);
                            }
                            Alert.alert('Removed', 'Vehicle details cleared.');
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '500' }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={[styles.actionButtonRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: '#059669' }]} 
                      onPress={() => setRcDocs([...rcDocs, { id: `rc_${Date.now()}`, vehicleNumber: '', vehicleModel: '', ownerName: '', fathersName: '', expiryDate: '', registrationDate: '', chassisNumber: '', engineNumber: '', fuelType: '', emissionNorms: '', address: '' }])}
                    >
                      <Ionicons name="add" size={14} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>Add Vehicle</Text>
                    </TouchableOpacity>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity style={styles.actionBtnOutline} onPress={() => showToast('Share', 'All RCs sharing links generated.')}>
                        <Text style={styles.actionBtnText}>Share All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtnSolid} onPress={() => showToast('Saved', 'Vehicle registries synchronized.')}>
                        <Text style={styles.actionBtnTextWhite}>Sync Registries</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </DocItem>
            </ErrorBoundary>

            {/* Insurance */}
            <ErrorBoundary fallbackTitle="Insurance Card">
              <DocItem
                icon="shield-outline"
                iconBg="#FEF3C7"
                iconColor="#B45309"
                title="Insurance"
                subtitle={insDocs[0]?.provider ? `${insDocs.length} Policy${insDocs.length > 1 ? 's' : ''} saved` : 'Pending Upload'}
                status={insDocs[0]?.provider ? `Active · Expiry ${insDocs[0]?.expiry || 'N/A'}` : 'Missing Document'}
                statusColor={insDocs[0]?.provider ? "#16A34A" : "#EF4444"}
                isExpanded={expandedDoc === 'Insurance'}
                onPress={() => toggleExpand('Insurance')}
                onUpload={() => handleDocumentUpload('Insurance')}
                docType="Insurance"
                ocrLoadingDoc={ocrLoadingDoc}
              >
                <View style={styles.expandedDocContent}>
                  {insDocs.map((ins, idx) => (
                    <View key={ins.id} style={[styles.editableFieldsCard, { marginBottom: 16 }]}>
                      <Text style={styles.editCardTitle}>Insurance Details #{idx + 1}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>Enter details manually or tap the camera icon to scan your document.</Text>
                      
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>POLICY NUMBER</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.editTextInput, { flex: 1, marginRight: 10, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', borderColor: (ins.policyNo && ins.policyNo.trim().length < 5) ? '#EF4444' : '#E5E7EB', borderWidth: 1 }]}>
                            <TextInput 
                              style={{ flex: 1, paddingHorizontal: 8, height: '100%', fontSize: 12, fontWeight: '600', color: '#1F2937', ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any) }}
                              value={ins.policyNo}
                              onChangeText={(val) => {
                                const updated = [...insDocs];
                                updated[idx].policyNo = val;
                                setInsDocs(updated);
                              }}
                              placeholder="EX: 3005/W-2011959/00/000"
                              placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
                              onPress={() => handleDocumentUpload('Insurance', ins.id)}
                            >
                              <Ionicons name="camera-outline" size={16} color="#D97706" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                            onPress={() => {
                              if (!ins.policyNo || ins.policyNo.trim().length < 5) return;
                              
                              Alert.alert('Verification Success', 'Policy verified.');
                              const updated = [...insDocs];
                              updated[idx].provider = 'ICICI Lombard General Insurance';
                              updated[idx].insuredName = profile.name || getRandomItem(MOCK_NAMES);
                              updated[idx].period = '25-Aug-2010 to 24-Aug-2011';
                              updated[idx].expiry = '24-Aug-2011';
                              updated[idx].idv = '₹46,785';
                              updated[idx].vehicleModel = getRandomItem(MOCK_MODELS);
                              setInsDocs(updated);
                            }}
                          >
                            <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                        {ins.policyNo !== '' && ins.policyNo.trim().length < 5 && (
                          <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Warning: Enter a valid Insurance Policy Number</Text>
                        )}
                      </View>

                      {ins.provider ? (
                        <View style={{ marginTop: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10 }}>EXTRACTED POLICY SCHEDULE</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            <DetailItem label="INSURED NAME" value={ins.insuredName} />
                            <DetailItem label="PROVIDER" value={ins.provider} />
                            <DetailItem label="PERIOD" value={ins.period} />
                            <DetailItem label="EXPIRY (MIDNIGHT)" value={ins.expiry} />
                            <DetailItem label="VEHICLE" value={ins.vehicleModel} />
                            <DetailItem label="DECLARED VALUE" value={ins.idv} />
                          </View>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                          onPress={() => {
                            if (insDocs.length > 1) {
                              setInsDocs(prev => prev.filter(r => r.id !== ins.id));
                            } else {
                              const updated = [...insDocs];
                              updated[idx] = { id: ins.id, policyNo: '', provider: '', insuredName: '', period: '', expiry: '', idv: '', vehicleModel: '' };
                              setInsDocs(updated);
                            }
                            Alert.alert('Removed', 'Insurance details cleared.');
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '500' }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={[styles.actionButtonRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: '#059669' }]} 
                      onPress={() => setInsDocs([...insDocs, { id: `ins_${Date.now()}`, policyNo: '', provider: '', insuredName: '', period: '', expiry: '', idv: '', vehicleModel: '' }])}
                    >
                      <Ionicons name="add" size={14} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>Add Policy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnSolid} onPress={() => showToast('Saved', 'Policy details saved.')}>
                      <Text style={styles.actionBtnTextWhite}>Save All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </DocItem>
            </ErrorBoundary>

            {/* PUC Certificate */}
            <ErrorBoundary fallbackTitle="PUC Card">
              <DocItem
                icon="leaf-outline"
                iconBg="#FCE7F3"
                iconColor="#BE185D"
                title="PUC Certificate"
                subtitle={pucDocs[0]?.certNo ? `${pucDocs.length} Certificate${pucDocs.length > 1 ? 's' : ''} saved` : "Pending Upload"}
                status={pucDocs[0]?.expiry || "Missing Document"}
                statusColor={pucDocs[0]?.expiry ? "#DC2626" : "#EF4444"}
                isExpanded={expandedDoc === 'PUC'}
                onPress={() => toggleExpand('PUC')}
                onUpload={() => handleDocumentUpload('PUC')}
                docType="PUC"
                ocrLoadingDoc={ocrLoadingDoc}
              >
                <View style={styles.expandedDocContent}>
                  {pucDocs.map((puc, idx) => (
                    <View key={puc.id} style={[styles.editableFieldsCard, { marginBottom: 16 }]}>
                      <Text style={styles.editCardTitle}>PUC Certificate #{idx + 1}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>Enter details manually or tap the camera icon to scan your document.</Text>
                      
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>CERTIFICATE NUMBER</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.editTextInput, { flex: 1, marginRight: 10, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', borderColor: (puc.certNo && puc.certNo.replace(/[\s-]/g, '').length < 8) ? '#EF4444' : '#E5E7EB', borderWidth: 1 }]}>
                            <TextInput 
                              style={{ flex: 1, paddingHorizontal: 8, height: '100%', fontSize: 12, fontWeight: '600', color: '#1F2937', ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any) }}
                              value={puc.certNo}
                              onChangeText={(val) => {
                                const updated = [...pucDocs];
                                updated[idx].certNo = val;
                                setPucDocs(updated);
                              }}
                              placeholder="EX: UP03400210003201"
                              placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
                              onPress={() => handleDocumentUpload('PUC', puc.id)}
                            >
                              <Ionicons name="camera-outline" size={16} color="#D97706" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                            onPress={() => {
                              if (!puc.certNo) return;
                              if (puc.certNo.replace(/[\s-]/g, '').length < 8) return;
                              
                              Alert.alert('Verification Success', 'PUC verified.');
                              const updated = [...pucDocs];
                              updated[idx].lastTestValue = '0.54 1/metre (Pass Limit: 2.45)';
                              updated[idx].expiry = '06/11/2023';
                              updated[idx].regNo = 'TN 07 BE 1234';
                              updated[idx].fuelType = 'Petrol';
                              updated[idx].emissionNorms = 'BS-VI';
                              setPucDocs(updated);
                            }}
                          >
                            <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                        {puc.certNo !== '' && puc.certNo.replace(/[\s-]/g, '').length < 8 && (
                          <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Warning: Enter a valid PUC Certificate Number</Text>
                        )}
                      </View>

                      {puc.expiry ? (
                        <View style={{ marginTop: 20, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#374151', marginBottom: 10 }}>EXTRACTED PUC DATA</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                            <DetailItem label="REGN NUMBER" value={puc.regNo} />
                            <DetailItem label="FUEL TYPE" value={puc.fuelType} />
                            <DetailItem label="TEST VALUE" value={puc.lastTestValue} />
                            <DetailItem label="EMISSION NORMS" value={puc.emissionNorms} />
                            <DetailItem label="EXPIRY DATE" value={puc.expiry} />
                          </View>
                        </View>
                      ) : null}

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                          onPress={() => {
                            if (pucDocs.length > 1) {
                              setPucDocs(prev => prev.filter(r => r.id !== puc.id));
                            } else {
                              const updated = [...pucDocs];
                              updated[idx] = { id: puc.id, certNo: '', regNo: '', fuelType: '', emissionNorms: '', lastTestValue: '', expiry: '', reminderSet: false };
                              setPucDocs(updated);
                            }
                            Alert.alert('Removed', 'PUC details cleared.');
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '500' }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={[styles.actionButtonRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: '#059669' }]} 
                      onPress={() => setPucDocs([...pucDocs, { id: `puc_${Date.now()}`, certNo: '', regNo: '', fuelType: '', emissionNorms: '', lastTestValue: '', expiry: '', reminderSet: false }])}
                    >
                      <Ionicons name="add" size={14} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>Add PUC</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnSolid} onPress={handleFindEmissionCenter}>
                      <Ionicons name="navigate-outline" size={14} color="#fff" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnTextWhite}>Find Test Center</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </DocItem>
            </ErrorBoundary>

            {/* FasTag */}
            <ErrorBoundary fallbackTitle="FasTag Card">
              <DocItem
                icon="cellular-outline"
                iconBg="#E0F2FE"
                iconColor="#0369A1"
                title="FasTag"
                subtitle={fastagDocs[0]?.tagId ? `${fastagDocs.length} FasTag${fastagDocs.length > 1 ? 's' : ''} Linked` : "Pending Upload"}
                status={fastagDocs[0]?.tagId ? "Active" : "Missing Document"}
                statusColor={fastagDocs[0]?.tagId ? "#16A34A" : "#EF4444"}
                isExpanded={expandedDoc === 'FasTag'}
                onPress={() => toggleExpand('FasTag')}
                onUpload={() => handleDocumentUpload('FasTag')}
                docType="FasTag"
                ocrLoadingDoc={ocrLoadingDoc}
                isLast
              >
                <View style={styles.expandedDocContent}>
                  {fastagDocs.map((fastag, idx) => (
                    <View key={fastag.id} style={[styles.editableFieldsCard, { marginBottom: 16 }]}>
                      <Text style={styles.editCardTitle}>FasTag Details #{idx + 1}</Text>
                      <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16, marginTop: -8 }}>Enter details manually or tap the camera icon to scan your document.</Text>
                      
                      <View style={styles.editInputGroup}>
                        <Text style={styles.editInputLabel}>TAG ID</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={[styles.editTextInput, { flex: 1, marginRight: 10, paddingHorizontal: 0, flexDirection: 'row', alignItems: 'center', borderColor: (fastag.tagId && fastag.tagId.trim().length < 8) ? '#EF4444' : '#E5E7EB', borderWidth: 1 }]}>
                            <TextInput 
                              style={{ flex: 1, paddingHorizontal: 8, height: '100%', fontSize: 12, fontWeight: '600', color: '#1F2937', ...((Platform.OS === 'web' ? { outlineStyle: 'none' } : {}) as any) }}
                              value={fastag.tagId}
                              onChangeText={(val) => {
                                const updated = [...fastagDocs];
                                updated[idx].tagId = val;
                                setFastagDocs(updated);
                              }}
                              placeholder="EX: FTG9900223388"
                              placeholderTextColor="#9CA3AF"
                            />
                            <TouchableOpacity 
                              style={{ paddingHorizontal: 10, height: '100%', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
                              onPress={() => handleDocumentUpload('FasTag', fastag.id)}
                            >
                              <Ionicons name="camera-outline" size={16} color="#D97706" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity 
                            style={{ padding: 12, backgroundColor: '#EFF6FF', borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' }}
                            onPress={() => {
                              if (!fastag.tagId || fastag.tagId.trim().length < 8) return;
                              
                              Alert.alert('Verification Success', 'FasTag linked successfully.');
                              const updated = [...fastagDocs];
                              updated[idx].balance = 420;
                              setFastagDocs(updated);
                            }}
                          >
                            <Ionicons name="checkmark-done" size={20} color="#2563EB" />
                          </TouchableOpacity>
                        </View>
                        {fastag.tagId !== '' && fastag.tagId.trim().length < 8 && (
                          <Text style={{ color: '#EF4444', fontSize: 11, marginTop: 4 }}>Warning: Enter a valid FasTag ID (min 8 characters)</Text>
                        )}
                      </View>

                      {/* Recharge Input Section */}
                      <View style={styles.rechargeWalletCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <Text style={styles.rechargeCardTitle}>FasTag Wallet</Text>
                          {fastag.balance !== null ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ fontSize: 10, color: '#6B7280', marginRight: 6 }}>BALANCE</Text>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>₹{fastag.balance}</Text>
                              <TouchableOpacity onPress={() => handleFasTagCheckBalance(idx)} style={{ marginLeft: 8, padding: 4 }}>
                                {fastag.checkingBalance ? <ActivityIndicator size="small" color="#2563EB" /> : <Ionicons name="refresh" size={14} color="#2563EB" />}
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity onPress={() => handleFasTagCheckBalance(idx)} style={{ flexDirection: 'row', alignItems: 'center' }}>
                              {fastag.checkingBalance ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={{ fontSize: 12, color: '#2563EB', fontWeight: '600' }}>Check Balance</Text>}
                            </TouchableOpacity>
                          )}
                        </View>

                        <View style={styles.rechargeInputRow}>
                          <TextInput
                            style={[styles.rechargeInput, (Platform.OS === 'web' ? { outlineStyle: 'none' } : undefined) as any]}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#9CA3AF"
                            value={fastag.rechargeAmount}
                            onChangeText={(val) => {
                              const updated = [...fastagDocs];
                              updated[idx].rechargeAmount = val;
                              setFastagDocs(updated);
                            }}
                            keyboardType="numeric"
                          />
                          <TouchableOpacity 
                            style={styles.rechargeSubmitBtn}
                            onPress={() => handleFasTagRecharge(idx)}
                            disabled={fastag.recharging || fastag.rechargeSuccess}
                          >
                            {fastag.recharging ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : fastag.rechargeSuccess ? (
                              <Ionicons name="checkmark-done" size={20} color="#fff" />
                            ) : (
                              <Text style={styles.rechargeSubmitBtnText}>Recharge</Text>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                        <TouchableOpacity 
                          style={{ flexDirection: 'row', alignItems: 'center', padding: 8 }}
                          onPress={() => {
                            if (fastagDocs.length > 1) {
                              setFastagDocs(prev => prev.filter(r => r.id !== fastag.id));
                            } else {
                              const updated = [...fastagDocs];
                              updated[idx] = { id: fastag.id, tagId: '', balance: null, checkingBalance: false, rechargeAmount: '', recharging: false, rechargeSuccess: false };
                              setFastagDocs(updated);
                            }
                            Alert.alert('Removed', 'FasTag details cleared.');
                          }}
                        >
                          <Ionicons name="trash-outline" size={14} color="#EF4444" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 13, color: '#EF4444', fontWeight: '500' }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <View style={[styles.actionButtonRow, { justifyContent: 'space-between' }]}>
                    <TouchableOpacity 
                      style={[styles.actionBtnOutline, { borderColor: '#059669' }]} 
                      onPress={() => setFastagDocs([...fastagDocs, { id: `fastag_${Date.now()}`, tagId: '', balance: null, checkingBalance: false, rechargeAmount: '', recharging: false, rechargeSuccess: false }])}
                    >
                      <Ionicons name="add" size={14} color="#059669" style={{ marginRight: 4 }} />
                      <Text style={[styles.actionBtnText, { color: '#059669' }]}>Add FasTag</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtnSolid} onPress={() => showToast('Saved', 'All FasTag details saved.')}>
                      <Text style={styles.actionBtnTextWhite}>Save All</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </DocItem>
            </ErrorBoundary>

          </View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

interface DocItemProps {
  icon: string;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  status: string;
  statusColor: string;
  isExpanded: boolean;
  onPress: () => void;
  onUpload: () => void;
  docType: string;
  ocrLoadingDoc: string | null;
  isLast?: boolean;
  children?: React.ReactNode;
}

function DocItem({ 
  icon, iconBg, iconColor, title, subtitle, status, statusColor, 
  isExpanded, onPress, onUpload, docType, ocrLoadingDoc, isLast, children 
}: DocItemProps) {
  const isLoading = ocrLoadingDoc === docType;
  
  return (
    <>
      <View style={styles.docItemWrapper}>
        <View style={styles.docItemHeaderRow}>
          <TouchableOpacity style={styles.docItem} onPress={onPress} activeOpacity={0.8}>
            <View style={[styles.docIconWrapper, { backgroundColor: iconBg }]}>
              <Ionicons name={icon as any} size={20} color={iconColor} />
            </View>
            <View style={styles.docTextContainer}>
              <Text style={styles.docTitle}>{title}</Text>
              <Text style={styles.docSubtitle}>{subtitle}</Text>
              <Text style={[styles.docStatus, { color: statusColor }]}>{status}</Text>
            </View>
          </TouchableOpacity>
          
          <View style={styles.itemRightActionRow}>

            <TouchableOpacity onPress={onPress} style={{ padding: 4 }}>
              <Ionicons name={isExpanded ? "chevron-up" : "chevron-forward"} size={20} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>
        
        {isLoading && (
          <View style={styles.ocrSpinnerCard}>
            <ActivityIndicator size="small" color="#D97706" />
            <Text style={styles.ocrSpinnerText}>Extracting details...</Text>
          </View>
        )}

        {isExpanded && !isLoading && (
          <View style={styles.expandedContentWrapper}>
            {children}
          </View>
        )}
      </View>
      {!isLast && <View style={styles.docDivider} />}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#FAF8F5' },

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
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  addButton: { padding: 4 },
  addButtonText: { fontSize: 15, fontWeight: '700', color: '#D97706' },

  scrollContent: { paddingBottom: 40, paddingHorizontal: 20, paddingTop: 24 },

  // Driving License Card (Pinned at the very top)
  licenseCardContainer: {
    marginBottom: 32,
    position: 'relative',
  },
  licenseCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  licenseCardActive: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  licenseTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  licenseType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  licenseCountry: { fontSize: 12, color: '#6B7280' },
  headerRightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardUploadBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(217,119,6,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D97706',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
  },
  verifiedText: { fontSize: 11, fontWeight: '700', color: '#4ADE80' },

  licenseNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 2,
    marginVertical: 14,
  },

  licenseBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 24,
  },
  licenseFieldLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  licenseFieldValue: { fontSize: 14, fontWeight: '700', color: '#F9FAFB' },

  // QR Code visual
  qrPlaceholder: {
    marginLeft: 'auto',
    gap: 3,
  },
  qrRow: { flexDirection: 'row', gap: 3 },
  qrDot: {
    width: 7,
    height: 7,
    borderRadius: 1,
    backgroundColor: '#9CA3AF',
  },

  // DL Expandable Details
  expandedLicContent: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e5e7eb',
  },

  // Document list
  docList: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  docItemWrapper: {
    width: '100%',
  },
  docItemHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  docItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
    flex: 1,
  },
  itemRightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemUploadBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  docIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTextContainer: { flex: 1, gap: 2 },
  docTitle: { fontSize: 15, fontWeight: '700', color: '#1F2937' },
  docSubtitle: { fontSize: 13, color: '#6B7280' },
  docStatus: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  docDivider: { height: 1, backgroundColor: '#F9FAFB' },

  // Expanded Doc details panel
  expandedContentWrapper: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 14,
    marginBottom: 16,
  },
  expandedDocContent: {
    gap: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailCol: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 16,
  },
  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 10,
  },
  actionBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  actionBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#D97706',
  },
  actionBtnTextWhite: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // OCR Loader Overlay for license
  ocrLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,26,26,0.85)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  ocrLoaderText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 10,
  },

  // OCR Loader spinner for items
  ocrSpinnerCard: {
    backgroundColor: '#FAF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 10,
  },
  ocrSpinnerText: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '700',
  },

  // Editable Textboxes Inside Expanded Views
  editableFieldsCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  editCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  editInputGroup: {
    marginBottom: 10,
  },
  editInputLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  editTextInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 32,
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },

  // FasTag Special Recharge Form
  rechargeWalletCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  rechargeCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    marginBottom: 6,
  },
  rechargeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rechargeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 13,
    color: '#1F2937',
  },
  rechargeSubmitBtn: {
    backgroundColor: '#0369A1',
    borderRadius: 8,
    height: 36,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rechargeSubmitBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // FasTag QR Code Feature Card
  qrFeatureCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
  },
  qrFeatureTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  qrActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  qrActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    height: 36,
    gap: 6,
    backgroundColor: '#FAF8F5',
  },
  qrActionText: {
    fontSize: 12,
    color: '#0369A1',
    fontWeight: '700',
  },
  qrDisplayArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadedQrImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 8,
  },
  removeQrBtn: {
    borderWidth: 1,
    borderColor: '#EF4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  removeQrBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'center',
    gap: 3,
    marginBottom: 8,
  },
  miniQrDot: {
    width: 6,
    height: 6,
    borderRadius: 1,
  },

  // Section title
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 16,
  },
});

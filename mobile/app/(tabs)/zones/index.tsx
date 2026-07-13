import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSettings } from '../../../hooks/useSettings';

interface TrafficAct {
  act: string;
  penalty: string;
  guidelines: string;
}

interface CategoryData {
  title: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  acts: TrafficAct[];
}

export const CATEGORY_DETAILS: Record<string, CategoryData> = {
  'Speed & limits': {
    title: 'Speed & limits',
    icon: 'flash',
    iconBg: '#FFEDD5',
    iconColor: '#C2410C',
    acts: [
      { act: 'Over-speeding (LMV)', penalty: '₹1,000 to ₹2,000 fine', guidelines: 'Speed limits are strictly enforced by speed guns. Keep within 50 km/h in city limits.' },
      { act: 'Over-speeding (Heavy Vehicle)', penalty: '₹2,000 to ₹4,000 fine', guidelines: 'Heavy vehicles face stricter penalties and potential vehicle impounding.' },
      { act: 'Dangerous Driving / Racing', penalty: '₹5,000 fine or up to 6 months imprisonment', guidelines: 'Racing on public roads or zig-zag driving carries heavy penalties and license suspension.' },
      { act: 'Slow Driving in Fast Lane', penalty: '₹500 fine', guidelines: 'Always keep left unless overtaking. Do not block the fast lane (extreme right).' },
      { act: 'Speeding in School Zone', penalty: '₹2,000 fine', guidelines: 'School zones have a strict limit of 25 km/h during operational hours.' },
      { act: 'Over-speeding on Expressway', penalty: '₹2,000 fine', guidelines: 'Do not exceed 120 km/h on expressways (for LMVs).' },
      { act: 'Racing and Trials of Speed', penalty: '₹5,000 fine', guidelines: 'Participating in unauthorized speed trials is a severe offense.' },
      { act: 'Reckless Driving at High Speed', penalty: '₹5,000 fine and license suspension', guidelines: 'Driving in a manner dangerous to the public.' },
      { act: 'Failing to Slow at Pedestrian Crossing', penalty: '₹1,000 fine', guidelines: 'Always slow down and yield to pedestrians at zebra crossings.' },
      { act: 'Speeding in Construction Zone', penalty: '₹2,000 fine', guidelines: 'Observe temporary speed limits around work zones.' },
      { act: 'Failing to maintain Safe Distance (Tailgating)', penalty: '₹1,000 fine', guidelines: 'Maintain at least a 3-second gap from the vehicle ahead.' },
      { act: 'Over-speeding (Two Wheeler)', penalty: '₹1,000 fine', guidelines: 'Two-wheelers typically have a lower speed limit on highways (e.g. 80 km/h).' },
      { act: 'Speeding on Bridge/Tunnel', penalty: '₹1,000 fine', guidelines: 'Speed limits are often reduced in structural bottlenecks.' },
      { act: 'Disobeying Speed Limit Sign', penalty: '₹1,000 fine', guidelines: 'Any localized speed limit sign must be strictly obeyed.' }
    ]
  },
  'Safety gear': {
    title: 'Safety gear',
    icon: 'car-sport',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    acts: [
      { act: 'Driving without Seatbelt', penalty: '₹1,000 fine', guidelines: 'All occupants in the vehicle, including rear seat passengers, must wear a seatbelt.' },
      { act: 'Riding without Helmet', penalty: '₹1,000 fine and 3 months license suspension', guidelines: 'Both the rider and pillion passenger must wear ISI-certified helmets securely strapped.' },
      { act: 'Child Safety Violation', penalty: '₹1,000 fine', guidelines: 'Children under 14 must be secured with safety belts or child restraint systems.' },
      { act: 'Helmet without ISI Mark', penalty: '₹1,000 fine', guidelines: 'Using a non-standard or construction helmet is treated as riding without a helmet.' },
      { act: 'Helmet Strap not Fastened', penalty: '₹1,000 fine', guidelines: 'A helmet is useless if it comes off during a crash. The strap must be buckled.' },
      { act: 'More than Two on Two-Wheeler', penalty: '₹1,000 fine and 3 months suspension', guidelines: 'Tripling on a bike is strictly prohibited.' },
      { act: 'Driving with Defective Seatbelt', penalty: '₹500 fine', guidelines: 'Ensure seatbelts are not frayed and retract properly.' },
      { act: 'Riding without Proper Shoes', penalty: '₹500 fine', guidelines: 'Riding a geared motorcycle wearing slippers/chappals is a safety hazard.' }
    ]
  },
  'Lane & overtaking': {
    title: 'Lane & overtaking',
    icon: 'car',
    iconBg: '#E0F2FE',
    iconColor: '#0369A1',
    acts: [
      { act: 'Overtaking from Left', penalty: '₹1,000 fine', guidelines: 'Always overtake from the right. Overtaking from the left is extremely dangerous and illegal.' },
      { act: 'Lane Cutting / Weaving', penalty: '₹1,000 fine', guidelines: 'Use indicator light at least 3 seconds before changing lanes. Maintain lane discipline.' },
      { act: 'Blocking Free Left Turn', penalty: '₹500 fine', guidelines: 'Do not block the left lane at junctions where a free left turn is allowed.' },
      { act: 'Straddling Lanes', penalty: '₹500 fine', guidelines: 'Drive within marked lanes. Do not drive on top of the lane markers.' },
      { act: 'Illegal U-Turn', penalty: '₹500 to ₹1,000 fine', guidelines: 'Do not take a U-turn where prohibited or on blind curves.' },
      { act: 'Overtaking on a Curve', penalty: '₹1,000 fine', guidelines: 'Never overtake where visibility is restricted.' },
      { act: 'Overtaking on a Bridge/Tunnel', penalty: '₹1,000 fine', guidelines: 'Solid white lines in tunnels/bridges mean no overtaking.' },
      { act: 'Not Giving Way to Overtaking Vehicle', penalty: '₹500 fine', guidelines: 'If someone is overtaking you, do not accelerate.' },
      { act: 'Driving Wrong Way', penalty: '₹5,000 fine', guidelines: 'Driving against the flow of traffic on a divided highway.' },
      { act: 'Failing to Signal Lane Change', penalty: '₹500 fine', guidelines: 'Indicators must be used before every lane change or turn.' },
      { act: 'Crossing Continuous Yellow Line', penalty: '₹1,000 fine', guidelines: 'A continuous yellow line prohibits passing or crossing.' },
      { act: 'Overtaking a School Bus', penalty: '₹1,000 fine', guidelines: 'Exercise extreme caution and do not overtake a stopped school bus.' }
    ]
  },
  'Signal & signage': {
    title: 'Signal & signage',
    icon: 'medical',
    iconBg: '#DCFCE7',
    iconColor: '#15803D',
    acts: [
      { act: 'Red Light Jumping', penalty: '₹1,000 to ₹5,000 fine and up to 3 months license suspension', guidelines: 'Always stop before the stop line when the signal is yellow or red.' },
      { act: 'Disobeying One-Way Sign', penalty: '₹1,000 fine', guidelines: 'Do not drive against the designated direction on one-way streets.' },
      { act: 'Stop Sign Violation', penalty: '₹500 fine', guidelines: 'You must bring the vehicle to a complete stop at a stop sign, yield to cross traffic, then proceed.' },
      { act: 'Ignoring Traffic Police Directions', penalty: '₹2,000 fine', guidelines: 'Manual traffic police signals override electronic traffic lights.' },
      { act: 'Crossing Zebra Crossing on Red', penalty: '₹500 fine', guidelines: 'Do not stop your vehicle on top of a zebra crossing.' },
      { act: 'Disobeying No Entry Sign', penalty: '₹2,000 fine', guidelines: 'Entering a road restricted for all or certain types of vehicles.' },
      { act: 'Disobeying Mandatory Traffic Signs', penalty: '₹500 fine', guidelines: 'Circular signs with blue background are mandatory (e.g., Turn Left Only).' },
      { act: 'Failing to Yield at Roundabout', penalty: '₹500 fine', guidelines: 'Traffic already in the roundabout has the right of way.' },
      { act: 'Jumping Amber Light', penalty: '₹500 fine', guidelines: 'Amber means stop unless it is unsafe to do so. Do not speed up to beat the red light.' }
    ]
  },
  'Documents': {
    title: 'Documents',
    icon: 'document-text',
    iconBg: '#F3F4F6',
    iconColor: '#4B5563',
    acts: [
      { act: 'Driving without License', penalty: '₹5,000 fine and/or community service', guidelines: 'Always carry a physical driving license or verify it digitally on DigiLocker/mParivahan.' },
      { act: 'Driving without Registration (RC)', penalty: '₹5,000 fine (first offense)', guidelines: 'Vehicles must have a valid registration certificate.' },
      { act: 'Driving without Insurance', penalty: '₹2,000 fine and/or 3 months imprisonment', guidelines: 'Third-party motor insurance is mandatory for all vehicles.' },
      { act: 'Expired Driving License', penalty: '₹5,000 fine', guidelines: 'Ensure your license is renewed before expiration.' },
      { act: 'Underage Driving', penalty: '₹25,000 fine on guardian and 3 years jail', guidelines: 'Minors caught driving face severe penalties for their parents/guardians.' },
      { act: 'Not Producing Documents on Demand', penalty: '₹500 fine', guidelines: 'You must show your documents to a uniformed officer when asked.' }
    ]
  },
  'Distraction & DUI': {
    title: 'Distraction & DUI',
    icon: 'eye-off',
    iconBg: '#FCE7F3',
    iconColor: '#BE185D',
    acts: [
      { act: 'Drunk Driving (BAC > 30mg/100ml)', penalty: '₹10,000 fine and/or up to 6 months jail', guidelines: 'DriveLegal has zero tolerance for DUI. A BAC reading above 0.03% will lead to immediate vehicle impounding.' },
      { act: 'Using Phone while Driving', penalty: '₹5,000 fine', guidelines: 'Handheld phone use is strictly prohibited.' },
      { act: 'Playing Extremely Loud Music', penalty: '₹500 fine', guidelines: 'Playing music above permissible decibel limits that distracts other road users is fined.' },
      { act: 'Watching Video while Driving', penalty: '₹5,000 fine', guidelines: 'Screens in the front seat must not display videos while the car is moving.' },
      { act: 'Smoking while Driving', penalty: '₹500 fine', guidelines: 'Smoking distracts the driver and is a fire hazard.' },
      { act: 'Driving under influence of Drugs', penalty: '₹10,000 fine and jail time', guidelines: 'Narcotics impair driving ability drastically.' },
      { act: 'Eating/Drinking while Driving', penalty: '₹500 fine', guidelines: 'Taking hands off the wheel to consume food can be classified as distracted driving.' }
    ]
  },
  'Parking & Halting': {
    title: 'Parking & Halting',
    icon: 'car-sport-outline',
    iconBg: '#E0E7FF',
    iconColor: '#4338CA',
    acts: [
      { act: 'Parking in No Parking Zone', penalty: '₹500 to ₹1,000 fine', guidelines: 'Do not park vehicles in marked No Parking zones or where it obstructs free flow of traffic.' },
      { act: 'Parking on Footpath', penalty: '₹1,000 fine', guidelines: 'Footpaths are strictly for pedestrians. Parking vehicles on them is an offense.' },
      { act: 'Obstructing Traffic', penalty: '₹500 fine', guidelines: 'Leaving a vehicle in a position that causes danger, obstruction or undue inconvenience.' }
    ]
  },
  'Commercial & Load': {
    title: 'Commercial & Load',
    icon: 'bus-outline',
    iconBg: '#FEF08A',
    iconColor: '#A16207',
    acts: [
      { act: 'Overloading of Goods', penalty: '₹20,000 + ₹2,000 per extra tonne', guidelines: 'Carrying load beyond the permissible weight limit specified in the RC is heavily penalized.' },
      { act: 'Overcrowding Passengers', penalty: '₹200 per extra passenger', guidelines: 'Transporting more passengers than the permitted seating capacity is dangerous and illegal.' },
      { act: 'Protruding Load', penalty: '₹1,000 fine', guidelines: 'Load projecting outside the vehicle dimensions without proper safety markers is not allowed.' }
    ]
  },
  'Emissions & Health': {
    title: 'Emissions & Health',
    icon: 'leaf-outline',
    iconBg: '#D9F99D',
    iconColor: '#4D7C0F',
    acts: [
      { act: 'No Valid PUC Certificate', penalty: '₹10,000 fine or 3 months imprisonment', guidelines: 'A valid Pollution Under Control (PUC) certificate must always be carried.' },
      { act: 'Using Pressure/Loud Horns', penalty: '₹1,000 to ₹2,000 fine', guidelines: 'Multi-toned or excessively loud horns are banned in city limits.' },
      { act: 'Smoky Exhaust', penalty: '₹500 fine', guidelines: 'Visible dense smoke from the exhaust indicates poor maintenance and violates emission norms.' }
    ]
  },
  'Vehicle Modifications': {
    title: 'Vehicle Modifications',
    icon: 'build-outline',
    iconBg: '#F3E8FF',
    iconColor: '#7E22CE',
    acts: [
      { act: 'Illegal Exhaust / Silencer', penalty: '₹1,000 fine', guidelines: 'Modifying silencers to produce a loud, popping sound is an offense.' },
      { act: 'Tinted Windows (Sun films)', penalty: '₹1,000 fine', guidelines: 'Use of black films is banned. Minimum visibility required is 70% for front/rear and 50% for side glasses.' },
      { act: 'Defective/Fancy Number Plate', penalty: '₹500 to ₹5,000 fine', guidelines: 'Only HSRP (High Security Registration Plates) or standard clear font plates are permitted.' }
    ]
  }
};

export default function BrowseRulesScreen({ isEmbedded = false }: { isEmbedded?: boolean }) {
  const router = useRouter();
  const { t } = useSettings();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [expandedAct, setExpandedAct] = useState<string | null>(null);

  const handleOpenCategory = (catName: string) => {
    setSelectedCategory(catName);
    setExpandedAct(null);
    setModalVisible(true);
  };

  const ContentWrapper = isEmbedded ? View : SafeAreaView;
  const ScrollWrapper = isEmbedded ? View : ScrollView;

  return (
    <ContentWrapper style={isEmbedded ? styles.embeddedContainer : styles.safeArea}>
      <View style={styles.container}>
        
        {/* HEADER */}
        {!isEmbedded && (
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}>
              <Ionicons name="arrow-back" size={24} color="#1f2937" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('browse_rules')}</Text>
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={20} color="#4B5563" />
            </TouchableOpacity>
          </View>
        )}

        <ScrollWrapper showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          {/* QUICK ANSWER BANNER */}
          <View style={styles.bannerContainer}>
            <View style={styles.bannerIconContainer}>
              <Ionicons name="sparkles" size={20} color="#9A3412" />
            </View>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{t('quick_answer_title')}</Text>
              <Text style={styles.bannerSubtitle}>{t('quick_answer_desc')}</Text>
            </View>
            <TouchableOpacity 
              style={styles.bannerButton}
              onPress={() => router.push('/ask')}
            >
              <Ionicons name="chatbubble-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.bannerButtonText}>{t('ask_btn')}</Text>
            </TouchableOpacity>
          </View>

          {/* BROWSE BY CATEGORY */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>{t('browse_category')}</Text>

            <View style={styles.gridContainer}>
              {/* Category 1 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Speed & limits')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#FFEDD5' }]}>
                  <Ionicons name="flash" size={20} color="#C2410C" />
                </View>
                <Text style={styles.categoryTitle}>{t('speed_limits')}</Text>
                <Text style={styles.categorySubtitle}>14 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 2 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Safety gear')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="car-sport" size={20} color="#B45309" />
                </View>
                <Text style={styles.categoryTitle}>{t('safety_gear')}</Text>
                <Text style={styles.categorySubtitle}>8 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 3 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Lane & overtaking')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#E0F2FE' }]}>
                  <Ionicons name="car" size={20} color="#0369A1" />
                </View>
                <Text style={styles.categoryTitle}>{t('lane_overtaking')}</Text>
                <Text style={styles.categorySubtitle}>12 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 4 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Signal & signage')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="medical" size={20} color="#15803D" />
                </View>
                <Text style={styles.categoryTitle}>{t('signal_signage')}</Text>
                <Text style={styles.categorySubtitle}>9 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 5 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Documents')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="document-text" size={20} color="#4B5563" />
                </View>
                <Text style={styles.categoryTitle}>{t('documents_paperwork')}</Text>
                <Text style={styles.categorySubtitle}>6 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 6 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Distraction & DUI')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="eye-off" size={20} color="#BE185D" />
                </View>
                <Text style={styles.categoryTitle}>{t('dui_substance')}</Text>
                <Text style={styles.categorySubtitle}>7 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 7 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Parking & Halting')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#E0E7FF' }]}>
                  <Ionicons name="car-sport-outline" size={20} color="#4338CA" />
                </View>
                <Text style={styles.categoryTitle}>Parking & Halting</Text>
                <Text style={styles.categorySubtitle}>3 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 8 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Commercial & Load')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#FEF08A' }]}>
                  <Ionicons name="bus-outline" size={20} color="#A16207" />
                </View>
                <Text style={styles.categoryTitle}>Commercial & Load</Text>
                <Text style={styles.categorySubtitle}>3 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 9 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Emissions & Health')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#D9F99D' }]}>
                  <Ionicons name="leaf-outline" size={20} color="#4D7C0F" />
                </View>
                <Text style={styles.categoryTitle}>Emissions & Health</Text>
                <Text style={styles.categorySubtitle}>3 {t('rules_count')}</Text>
              </TouchableOpacity>

              {/* Category 10 */}
              <TouchableOpacity 
                style={styles.categoryCard}
                onPress={() => handleOpenCategory('Vehicle Modifications')}
              >
                <View style={[styles.iconWrapper, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="build-outline" size={20} color="#7E22CE" />
                </View>
                <Text style={styles.categoryTitle}>Modifications</Text>
                <Text style={styles.categorySubtitle}>3 {t('rules_count')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollWrapper>

      </View>

      {/* Category Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => { setModalVisible(false); setExpandedAct(null); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            {/* Modal Header */}
            {selectedCategory && CATEGORY_DETAILS[selectedCategory] && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderLeft}>
                    <View style={[styles.modalIconWrapper, { backgroundColor: CATEGORY_DETAILS[selectedCategory].iconBg }]}>
                      <Ionicons name={CATEGORY_DETAILS[selectedCategory].icon as any} size={22} color={CATEGORY_DETAILS[selectedCategory].iconColor} />
                    </View>
                    <Text style={styles.modalTitle}>{CATEGORY_DETAILS[selectedCategory].title}</Text>
                  </View>
                  <TouchableOpacity onPress={() => { setModalVisible(false); setExpandedAct(null); }}>
                    <Ionicons name="close" size={24} color="#1f2937" />
                  </TouchableOpacity>
                </View>

                {/* Modal Body */}
                <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                  <Text style={styles.modalDesc}>
                    Local Traffic Acts and penal guidelines. Tap an act to read compliance instructions.
                  </Text>
                  
                  {CATEGORY_DETAILS[selectedCategory].acts.map((item, idx) => {
                    const isExpanded = expandedAct === item.act;
                    return (
                      <View key={idx} style={styles.accordionItem}>
                        <TouchableOpacity 
                          style={styles.accordionHeader}
                          onPress={() => setExpandedAct(isExpanded ? null : item.act)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.accordionTitleContainer}>
                            <Text style={styles.accordionAct}>{item.act}</Text>
                            <Text style={styles.accordionPenalty}>{item.penalty}</Text>
                          </View>
                          <Ionicons 
                            name={isExpanded ? "chevron-up" : "chevron-down"} 
                            size={18} 
                            color="#9ca3af" 
                          />
                        </TouchableOpacity>
                        
                        {isExpanded && (
                          <View style={styles.accordionDetails}>
                            <Text style={styles.detailsLabel}>GUIDELINES & SAFE DRIVING</Text>
                            <Text style={styles.detailsText}>{item.guidelines}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ContentWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  embeddedContainer: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  searchButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  bannerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
  },
  bannerIconContainer: {
    marginRight: 12,
  },
  bannerTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9A3412',
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#57534E',
    lineHeight: 16,
  },
  bannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D97706',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  categorySubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
    minHeight: 450,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1f2937',
  },
  modalScroll: {
    marginBottom: 20,
  },
  modalDesc: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 20,
  },
  accordionItem: {
    backgroundColor: '#FAF8F5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  accordionTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  accordionAct: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  accordionPenalty: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '600',
    marginTop: 4,
  },
  accordionDetails: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    padding: 16,
  },
  detailsLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
});

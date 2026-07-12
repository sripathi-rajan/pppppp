import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'en' | 'ta' | 'hi' | 'te';

interface UserProfile {
  name: string;
  avatar: string;
  drivingSince: string;
  country?: string;
  state?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
}

export interface SharedLocation {
  latitude: number;
  longitude: number;
  speedLimit: number | null;
  zoneType: string;
  helmetRequired: boolean;
  placeName: string;
  regionName: string;
}

interface Translations {
  [key: string]: {
    [lang in Language]: string;
  };
}

const translations: Translations = {
  // Common
  'back': { en: 'Back', ta: 'பின்னால்', hi: 'पीछे', te: 'వెనుకకు' },
  'save': { en: 'Save', ta: 'சேமி', hi: 'सहेजें', te: 'సేవ్' },
  'cancel': { en: 'Cancel', ta: 'ரத்து செய்', hi: 'रद्द करें', te: 'రద్దు చేయి' },
  'add': { en: 'Add', ta: 'சேர்', hi: 'जोड़ें', te: 'జోడించు' },
  'on': { en: 'On', ta: 'ஆன்', hi: 'चालू', te: 'ఆన్' },
  'off': { en: 'Off', ta: 'ஆஃப்', hi: 'बंद', te: 'ఆఫ్' },

  // Tabs
  'home': { en: 'Home', ta: 'முகப்பு', hi: 'होम', te: 'హోమ్' },
  'ask': { en: 'Ask', ta: 'கேட்க', hi: 'पूछें', te: 'అడగండి' },
  'fines': { en: 'Fines', ta: 'அபராதங்கள்', hi: 'जुर्माना', te: 'జరిమానాలు' },
  'rules': { en: 'Rules', ta: 'விதிகள்', hi: 'नियम', te: 'నియమాలు' },
  'you': { en: 'You', ta: 'நீங்கள்', hi: 'आप', te: 'మీరు' },

  // Home
  'greeting': { en: 'GOOD MORNING, {name}', ta: 'காலை வணக்கம், {name}', hi: 'सुप्रभात, {name}', te: 'శుభోదయం, {name}' },
  'location_label': { en: 'You are in', ta: 'நீங்கள் இருப்பது', hi: 'आप यहाँ हैं', te: 'మీరు ఇక్కడ ఉన్నారు' },
  'speed': { en: 'SPEED', ta: 'வேகம்', hi: 'गति', te: 'వేగం' },
  'fine_zone': { en: 'FINE ZONE', ta: 'அபராத மண்டலம்', hi: 'जुर्माना क्षेत्र', te: 'జరిమానా ప్రాంతం' },
  'helmet': { en: 'HELMET', ta: 'தலைக்கவசம்', hi: 'हेल्मेट', te: 'హెల్మెట్' },
  'mandatory': { en: 'Mandatory', ta: 'கட்டாயம்', hi: 'अनिवार्य', te: 'తప్పనిసరి' },
  'ask_title': { en: 'Ask DriveLegal', ta: 'டிரைவ்லீகலிடம் கேளுங்கள்', hi: 'DriveLegal से पूछें', te: 'DriveLegal ని అడగండి' },
  'ask_subtitle': { en: 'Plain-language Q&A', ta: 'எளிய மொழி கேள்வி பதில்', hi: 'सरल भाषा प्रश्नोत्तर', te: 'సరళ భాషా ప్రశ్నోత్తరాలు' },
  'challan_title': { en: 'Challan calculator', ta: 'சலான் கால்குலேட்டர்', hi: 'चालान कैलकुलेटर', te: 'చలాన్ కాలిక్యులేటర్' },
  'challan_subtitle': { en: 'Estimate fines', ta: 'அபராதங்களை மதிப்பிடவும்', hi: 'जुर्माने का अनुमान लगाएं', te: 'జరిమానాలను అంచనా వేయండి' },
  'vault_title': { en: 'Document vault', ta: 'ஆவண பெட்டகம்', hi: 'दस्तावेज़ तिजोरी', te: 'డాక్యుమెంట్ వాల్ట్' },
  'vault_subtitle': { en: '3 documents', ta: '3 ஆவணங்கள்', hi: '3 दस्तावेज़', te: '3 పత్రాలు' },
  'sos_title': { en: 'SOS Emergency', ta: 'SOS அவசரம்', hi: 'SOS आपातकाल', te: 'SOS ఎమర్జెన్సీ' },
  'sos_subtitle': { en: 'Quick help', ta: 'உடனடி உதவி', hi: 'त्वरित मदद', te: 'త్వరిత సహాయం' },
  'report_title': { en: 'Report', ta: 'அறிக்கை', hi: 'रिपोर्ट', te: 'రిపోర్ట్' },
  'report_subtitle': { en: 'File a complaint', ta: 'புகார் அளி', hi: 'शिकायत दर्ज करें', te: 'ఫిర్యాదు చేయండి' },
  'todays_brief': { en: "Today's brief", ta: 'இன்றைய சுருக்கம்', hi: 'आज का विवरण', te: 'నేటి సంక్షిప్త సమాచారం' },
  'see_all': { en: 'See all', ta: 'அனைத்தையும் பார்', hi: 'सभी देखें', te: 'అన్నీ చూడండి' },

  // Ask
  'assistant_name': { en: 'DriveLegal Assistant', ta: 'டிரைவ்லீகல் உதவியாளர்', hi: 'DriveLegal सहायक', te: 'DriveLegal సహాయకుడు' },
  'assistant_status': { en: 'Online · Location-aware', ta: 'ஆன்லைன் · இருப்பிட விழிப்புணர்வு', hi: 'ऑनलाइन · स्थान-जागरूक', te: 'ఆన్‌లైన్ · స్థాన-అవగాహన' },
  'input_placeholder': { en: 'Ask about a rule, fine, or docu...', ta: 'விதி, அபராதம் அல்லது ஆவணம் பற்றி கேளுங்கள்...', hi: 'नियम, जुर्माने या दस्तावेज़ के बारे में पूछें...', te: 'నియమం, జరిమానా లేదా పత్రం గురించి అడగండి...' },

  // Settings
  'your_profile': { en: 'Your profile', ta: 'உங்கள் சுயவிவரம்', hi: 'आपकी प्रोफाइल', te: 'మీ ప్రొఫైల్' },
  'open_violations': { en: 'Open violations', ta: 'திறந்த மீறல்கள்', hi: 'खुले उल्लंघन', te: 'బహిరంగ ఉల్లంఘనలు' },
  'outstanding_fines': { en: 'Outstanding fines', ta: 'நிலுவையில் உள்ள அபராதங்கள்', hi: 'बकाया जुर्माना', te: 'బకాయి జరిమానాలు' },
  'license_points': { en: 'License points', ta: 'உரிம புள்ளிகள்', hi: 'लाइसेंस अंक', te: 'లైసెన్స్ పాయింట్లు' },
  'country_state': { en: 'Country & state', ta: 'நாடு மற்றும் மாநிலம்', hi: 'देश और राज्य', te: 'దేశం మరియు రాష్ట్రం' },
  'language': { en: 'Language', ta: 'மொழி', hi: 'भाषा', te: 'భాష' },
  'vehicles': { en: 'Vehicles', ta: 'வாகனங்கள்', hi: 'वाहन', te: 'వాహనాలు' },
  'notifications': { en: 'Notifications', ta: 'அறிவிப்புகள்', hi: 'सूचनाएं', te: 'నోటిఫికేషన్లు' },
  'offline_pack': { en: 'Offline pack', ta: 'ஆஃப்லைன் பேக்', hi: 'ऑफ़लाइन पैक', te: 'ఆఫ్‌లైన్ ప్యాక్' },
  'privacy_data': { en: 'Privacy & data', ta: 'தனியுரிமை மற்றும் தரவு', hi: 'गोपनीयता और डेटा', te: 'గోప్యత 및 డేటా' },
  'driving_since': { en: 'Personal · Driving since {year}', ta: 'தனிப்பட்ட · {year} முதல் ஓட்டுதல்', hi: 'व्यक्तिगत · {year} से ड्राइविंग', te: 'వ్యక్తిగత · {year} నుండి డ్రైవింగ్' },
  'safe_driver': { en: 'Safe driver', ta: 'பாதுகாப்பான ஓட்டுநர்', hi: 'सुरक्षित ड्राइवर', te: 'సురక్షిత డ్రైవర్' },

  // Settings & Jurisdiction
  'driving_jurisdiction': { en: 'Driving Jurisdiction', ta: 'ஓட்டுநர் அதிகார வரம்பு', hi: 'ड्राइविंग अधिकार क्षेत्र', te: 'డ్రైవింగ్ అధికార పరిధి' },
  'select_country': { en: 'Select Country', ta: 'நாட்டைத் தேர்ந்தெடுக்கவும்', hi: 'देश चुनें', te: 'దేశాన్ని ఎంచుకోండి' },
  'select_state': { en: 'Select State / Region', ta: 'மாநிலம் / பகுதியைத் தேர்ந்தெடுக்கவும்', hi: 'राज्य / क्षेत्र चुनें', te: 'రాష్ట్రం / ప్రాంతాన్ని ఎంచుకోండి' },
  'apply_jurisdiction': { en: 'Apply Jurisdiction', ta: 'அதிகார வரம்பை பயன்படுத்து', hi: 'अधिकार क्षेत्र लागू करें', te: 'అధికార పరిధిని వర్తించండి' },
  'edit_profile': { en: 'Edit Profile', ta: 'சுயவிவரத்தைத் திருத்து', hi: 'प्रोफ़ाइल संपादित करें', te: 'ప్రొఫైల్‌ను సవరించండి' },
  'full_name': { en: 'Full Name', ta: 'முழு பெயர்', hi: 'पूरा नाम', te: 'పూర్తి పేరు' },
  'enter_your_name': { en: 'Enter your name', ta: 'உங்கள் பெயரை உள்ளிடவும்', hi: 'अपना नाम दर्ज करें', te: 'మీ పేరు నమోదు చేయండి' },
  'logout': { en: 'Logout', ta: 'வெளியேறு', hi: 'लॉग आउट', te: 'లాగ్ అవుట్ చేయండి' },

  // Vehicles
  'view_list': { en: 'View List', ta: 'பட்டியலைக் காண்க', hi: 'सूची देखें', te: 'జాబితాను చూడండి' },
  'vehicle_name': { en: 'Vehicle Name / Nickname', ta: 'வாகனத்தின் பெயர்', hi: 'वाहन का नाम', te: 'వాహనం పేరు' },
  'eg_swift': { en: 'e.g. Swift or Activa', ta: 'எ.கா. Swift அல்லது Activa', hi: 'उदा. Swift या Activa', te: 'ఉదా. Swift లేదా Activa' },
  'registration_number': { en: 'Registration Number', ta: 'பதிவு எண்', hi: 'पंजीकरण संख्या', te: 'రిజిస్ట్రేషన్ సంఖ్య' },
  'eg_tn': { en: 'e.g. TN 09 BX 4421', ta: 'எ.கா. TN 09 BX 4421', hi: 'उदा. TN 09 BX 4421', te: 'ఉదా. TN 09 BX 4421' },
  'make_model': { en: 'Make / Model', ta: 'தயாரிப்பு / மாடல்', hi: 'निर्माता / मॉडल', te: 'తయారీ / మోడల్' },
  'eg_swift_vxi': { en: 'e.g. Swift VXI or Activa 6G', ta: 'எ.கா. Swift VXI அல்லது Activa 6G', hi: 'उदा. Swift VXI या Activa 6G', te: 'ఉదా. Swift VXI లేదా Activa 6G' },
  'vehicle_type': { en: 'Vehicle Type', ta: 'வாகன வகை', hi: 'वाहन का प्रकार', te: 'వాహనం రకం' },
  'car': { en: 'Car', ta: 'கார்', hi: 'कार', te: 'కారు' },
  'two_wheeler': { en: 'Two Wheeler', ta: 'இரு சக்கர வாகனம்', hi: 'दोपहिया वाहन', te: 'ద్విచక్ర వాహనం' },
  'commercial': { en: 'Commercial', ta: 'வணிக வாகனம்', hi: 'वाणिज्यिक', te: 'వాణిజ్య వాహనం' },
  'rc_book_photo': { en: 'RC Book Photo', ta: 'RC புத்தக புகைப்படம்', hi: 'RC बुक फोटो', te: 'RC బుక్ ఫోటో' },
  'select_rc_photo': { en: 'Select RC Book Photo', ta: 'RC புகைப்படத்தை தேர்ந்தெடுக்கவும்', hi: 'RC फोटो चुनें', te: 'RC ఫోటోను ఎంచుకోండి' },
  'add_vehicle': { en: 'Add vehicle', ta: 'வாகனத்தை சேர்', hi: 'वाहन जोड़ें', te: 'వాహనాన్ని జోడించండి' },
  'no_vehicles': { en: 'No vehicles saved yet.', ta: 'வாகனங்கள் எதுவும் சேமிக்கப்படவில்லை.', hi: 'अभी तक कोई वाहन सहेजा नहीं गया है.', te: 'ఇంకా వాహనాలు సేవ్ చేయబడలేదు.' },

  // Documents Vault
  'add_document': { en: 'Add Document', ta: 'ஆவணத்தை சேர்', hi: 'दस्तावेज़ जोड़ें', te: 'పత్రాన్ని జోడించండి' },
  'driving_license': { en: 'DRIVING LICENSE', ta: 'ஓட்டுநர் உரிமம்', hi: 'ड्राइविंग लाइसेंस', te: 'డ్రైవింగ్ లైసెన్స్' },
  'holder': { en: 'HOLDER', ta: 'உரிமையாளர்', hi: 'धारक', te: 'కలిగి ఉన్నవారు' },
  'valid_till': { en: 'VALID TILL', ta: 'செல்லுபடியாகும்', hi: 'तक मान्य', te: 'చెల్లుబాటు అయ్యే తేదీ' },
  'verify_extracted_dl': { en: 'Verify Extracted License Details', ta: 'பிரித்தெடுக்கப்பட்ட உரிம விவரங்களை சரிபார்க்கவும்', hi: 'निकाले गए लाइसेंस विवरण सत्यापित करें', te: 'సంగ్రహించిన లైసెన్స్ వివరాలను ధృవీకరించండి' },
  'license_number': { en: 'LICENSE NUMBER', ta: 'உரிம எண்', hi: 'लाइसेंस नंबर', te: 'లైసెన్స్ నంబర్' },
  'extracted_details': { en: 'EXTRACTED DETAILS', ta: 'பிரித்தெடுக்கப்பட்ட விவரங்கள்', hi: 'निकाले गए विवरण', te: 'సంగ్రహిత వివరాలు' },
  'holder_name': { en: 'HOLDER NAME', ta: 'உரிமையாளர் பெயர்', hi: 'धारक का नाम', te: 'యజమాని పేరు' },
  'fathers_name': { en: 'S/W/D OF', ta: 'தந்தை/கணவர் பெயர்', hi: 'पिता/पति का नाम', te: 'తండ్రి/భర్త పేరు' },
  'dob': { en: 'DOB', ta: 'பிறந்த தேதி', hi: 'जन्म तिथि', te: 'పుట్టిన తేదీ' },
  'blood_group': { en: 'BLOOD GROUP', ta: 'இரத்த வகை', hi: 'रक्त समूह', te: 'రక్త వర్గం' },
  'issue_date': { en: 'ISSUE DATE', ta: 'வழங்கப்பட்ட தேதி', hi: 'जारी करने की तिथि', te: 'జారీ చేసిన తేదీ' },
  'validity': { en: 'VALIDITY', ta: 'செல்லுபடியாகும் காலம்', hi: 'वैधता', te: 'చెల్లుబాటు' },
  'vehicle_class': { en: 'VEHICLE CLASS', ta: 'வாகன வகுப்பு', hi: 'वाहन वर्ग', te: 'వాహన తరగతి' },
  'authority': { en: 'AUTHORITY', ta: 'அதிகாரம்', hi: 'अधिकरण', te: 'అధికారం' },
  'address': { en: 'ADDRESS', ta: 'முகவரி', hi: 'पता', te: 'చిరునామా' },
  'remove': { en: 'Remove', ta: 'அகற்று', hi: 'हटाएं', te: 'తొలగించు' },
  'save_changes': { en: 'Save Changes', ta: 'மாற்றங்களை சேமி', hi: 'परिवर्तन सहेजें', te: 'మార్పులను సేవ్ చేయండి' },
  'other_documents': { en: 'OTHER DOCUMENTS', ta: 'பிற ஆவணங்கள்', hi: 'अन्य दस्तावेज़', te: 'ఇతర పత్రాలు' },
  'vehicle_rc': { en: 'Vehicle RC', ta: 'வாகன RC', hi: 'वाहन RC', te: 'వాహనం RC' },
  'insurance': { en: 'Insurance', ta: 'காப்பீடு', hi: 'बीमा', te: 'భీమా' },
  'puc_certificate': { en: 'PUC Certificate', ta: 'PUC சான்றிதழ்', hi: 'PUC प्रमाणपत्र', te: 'PUC సర్టిఫికేట్' },
  'fastag': { en: 'FasTag', ta: 'FasTag', hi: 'FasTag', te: 'FasTag' },
  'pending_upload': { en: 'Pending Upload', ta: 'பதிவேற்றம் நிலுவையில் உள்ளது', hi: 'अपलोड लंबित', te: 'అప్‌లోడ్ పెండింగ్‌లో ఉంది' },
  'missing_document': { en: 'Missing Document', ta: 'விடுபட்ட ஆவணம்', hi: 'लापता दस्तावेज़', te: 'పత్రం లేదు' },
  'active': { en: 'Active', ta: 'செயலில்', hi: 'सक्रिय', te: 'క్రియాశీల' },

  // Tabs (icons)
  'tab_home': { en: 'Home', ta: 'முகப்பு', hi: 'होम', te: 'హోమ్' },
  'tab_ask': { en: 'Ask', ta: 'கேள்', hi: 'पूछें', te: 'అడగండి' },
  'tab_fines': { en: 'Fines', ta: 'அபராதங்கள்', hi: 'जुर्माना', te: 'జరిమానాలు' },
  'tab_rules': { en: 'Rules', ta: 'விதிகள்', hi: 'नियम', te: 'నియమాలు' },
  'tab_map': { en: 'Map', ta: 'வரைபடம்', hi: 'नक्शा', te: 'మ్యాప్' },
  'tab_you': { en: 'You', ta: 'நீங்கள்', hi: 'आप', te: 'మీరు' },

  // Home Screen
  'helmet_rule_update': { en: 'Helmet rule update', ta: 'ஹெல்மெட் விதி புதுப்பிப்பு', hi: 'हेलमेट नियम अपडेट', te: 'హెల్మెట్ నియమం నవీకరణ' },
  'helmet_rule_desc': { en: 'Tamil Nadu helmet violations can carry a ₹1,000 fine. Verify current state notices before payment.', ta: 'தமிழ்நாட்டில் ஹெல்மெட் விதியை மீறினால் ₹1,000 அபராதம். பணம் செலுத்துவதற்கு முன் தற்போதைய மாநில அறிவிப்புகளை சரிபார்க்கவும்.', hi: 'तमिलनाडु में हेलमेट उल्लंघन पर ₹1,000 का जुर्माना हो सकता है। भुगतान से पहले वर्तमान राज्य नोटिस सत्यापित करें।', te: 'తమిళనాడులో హెల్మెట్ నిబంధనలు ఉల్లంఘిస్తే ₹1,000 జరిమానా విధించవచ్చు. చెల్లించే ముందు ప్రస్తుత రాష్ట్ర నోటీసులను ధృవీకరించండి.' },
  'monsoon_advisory': { en: 'Monsoon advisory', ta: 'பருவமழை ஆலோசனை', hi: 'मानसून सलाह', te: 'రుతుపవనాల సలహా' },
  'monsoon_desc': { en: 'Hazard lights only when stationary. Reduced visibility warning active.', ta: 'வாகனம் நிற்கும் போது மட்டுமே அபாய விளக்குகள். குறைந்த தெரிவுநிலை எச்சரிக்கை செயலில் உள்ளது.', hi: 'वahan के स्थिर होने पर ही हैज़र्ड लाइटें जलाएं। कम दृश्यता की चेतावनी सक्रिय है।', te: 'వాహనం ఆగి ఉన్నప్పుడు మాత్రమే ప్రమాద లైట్లు వేయాలి. తక్కువ దృశ్యమానత హెచ్చరిక చురుకుగా ఉంది.' },
  'speed_enforcement': { en: 'Speed enforcement active', ta: 'வேக கட்டுப்பாடு செயலில் உள்ளது', hi: 'गति प्रवर्तन सक्रिय', te: 'వేగ నియంత్రణ చురుకుగా ఉంది' },
  'speed_enforcement_desc': { en: 'Radar speed guns deployed on OMR and GST Road Chennai. Keep within 50 km/h limits.', ta: 'சென்னை OMR மற்றும் GST சாலையில் ரேடார் வேக துப்பாக்கிகள் பயன்படுத்தப்பட்டுள்ளன. மணிக்கு 50 கிமீ வேக வரம்பிற்குள் செல்லவும்.', hi: 'OMR और GST रोड चेन्नई पर रडार स्पीड गन तैनात हैं। 50 किमी/घंटा की सीमा के भीतर रहें।', te: 'చెన్నై OMR 및 GST రోడ్‌లో రాడార్ స్పీడ్ గన్స్ మోహరించబడ్డాయి. గంటకు 50 కి.మీ వేగ పరిమితిలో ఉంచండి.' },
  'emergency_alert': { en: 'Emergency Contact Alert', ta: 'அவசர தொடர்பு எச்சரிக்கை', hi: 'आपातकालीन संपर्क अलर्ट', te: 'అత్యవసర సంప్రదింపు హెచ్చరిక' },
  'emergency_desc': { en: 'Saves contact details to auto‑SMS your GPS coordinates when SOS is triggered.', ta: 'SOS தூண்டப்படும்போது உங்கள் ஜிபிஎஸ் ஆயத்தொகுப்புகளை தானாக எஸ்எம்எஸ் செய்ய தொடர்பு விவரங்களை சேமிக்கிறது.', hi: 'SOS ट्रिगर होने पर आपके GPS निर्देशांक को ऑटो‑SMS करने के लिए संपर्क विवरण सहेजता है।', te: 'SOS ప్రేరేపించబడినప్పుడు మీ GPS కోఆర్డినేట్‌లను ఆటో‑SMS చేయడానికి సంప్రదింపు వివరాలను సేవ్ చేస్తుంది.' },

  // Ask Screen
  'ask_intro': { en: 'Hi there 👋 I\'m your DriveLegal assistant. Ask anything about traffic rules, fines, or paperwork — in plain language.', ta: 'வணக்கம் 👋 நான் உங்கள் டிரைவ்லீகல் உதவியாளர். போக்குவரத்து விதிகள், அபராதங்கள் அல்லது ஆவணங்கள் பற்றி எதையும் கேளுங்கள்.', hi: 'नमस्ते 👋 मैं आपका ड्राइवलीगल सहायक हूँ। यातायात नियमों, जुर्माने, या कागजी कार्रवाई के बारे में कुछ भी पूछें।', te: 'నమస్కారం 👋 నేను మీ డ్రైవ్‌లీగల్ అసిస్టెంట్‌ని. ట్రాఫిక్ నియమాలు, జరిమానాలు లేదా వ్రాతపని గురించి ఏదైనా అడగండి.' },
  'ask_tip': { en: 'Tip: set your name under You → Your profile.', ta: 'குறிப்பு: நீங்கள் → உங்கள் சுயவிவரம் என்பதன் கீழ் உங்கள் பெயரை அமைக்கவும்.', hi: 'सुझाव: आप → आपकी प्रोफ़ाइल के अंतर्गत अपना नाम सेट करें।', te: 'చిట్కా: మీరు → మీ ప్రొఫైల్ క్రింద మీ పేరును సెట్ చేయండి.' },
  'ask_suggest_1': { en: 'What\'s the fine for no helmet in Tamil Nadu?', ta: 'தமிழ்நாட்டில் ஹெல்மெட் அணியாததற்கு அபராதம் என்ன?', hi: 'तमिलनाडु में बिना हेलमेट के जुर्माना क्या है?', te: 'తమిళనాడులో హెల్మెట్ లేకుండా జరిమానా ఎంత?' },
  'ask_suggest_2': { en: 'Is drunk driving a criminal offence?', ta: 'குடிபோதையில் வாகனம் ஓட்டுவது கிரிமினல் குற்றமா?', hi: 'क्या नशे में गाड़ी चलाना एक आपराधिक अपराध है?', te: 'మద్యం సేవించి వాహనం నడపడం నేరమా?' },
  'ask_suggest_3': { en: 'What rules apply at my location?', ta: 'எனது இருப்பிடத்தில் என்ன விதிகள் பொருந்தும்?', hi: 'मेरे स्थान पर कौन से नियम लागू होते हैं?', te: 'నా ప్రదేశంలో ఏ నియమాలు వర్తిస్తాయి?' },
  'ask_placeholder': { en: 'Ask about rules, fines, or paperwork...', ta: 'விதிகள், அபராதங்கள் அல்லது ஆவணங்கள் பற்றி கேளுங்கள்...', hi: 'नियमों, जुर्माने या कागजी कार्रवाई के बारे में पूछें...', te: 'నియమాలు, జరిమానాలు లేదా వ్రాతపని గురించి అడగండి...' },

  // Fines Screen
  'challan_search': { en: 'Challan Search', ta: 'சலான் தேடல்', hi: 'चालान खोज', te: 'చలాన్ శోధన' },
  'challan_desc_long': { en: 'Look up outstanding traffic challans instantly using your vehicle registration number.', ta: 'உங்கள் வாகனப் பதிவு எண்ணைப் பயன்படுத்தி நிலுவையில் உள்ள போக்குவரத்துச் சலான்களை உடனடியாகப் பார்க்கவும்.', hi: 'अपने वाहन पंजीकरण संख्या का उपयोग करके तुरंत बकाया ट्रैफ़िक चालान देखें।', te: 'మీ వాహన రిజిస్ట్రేషన్ నంబర్‌ను ఉపయోగించి పెండింగ్‌లో ఉన్న ట్రాఫిక్ చలాన్‌లను తక్షణమే చూడండి.' },
  'vehicle_reg_number': { en: 'VEHICLE REGISTRATION NUMBER', ta: 'வாகனப் பதிவு எண்', hi: 'वाहन पंजीकरण संख्या', te: 'వాహన రిజిస్ట్రేషన్ సంఖ్య' },
  'verify_fines': { en: 'Verify Fines', ta: 'அபராதங்களை சரிபார்க்கவும்', hi: 'जुर्माना सत्यापित करें', te: 'జరిమానాలను ధృవీకరించండి' },

  // Rules Screen
  'browse_rules': { en: 'Browse rules', ta: 'விதிகளை உலாவுக', hi: 'नियम ब्राउज़ करें', te: 'నియమాలను బ్రౌజ్ చేయండి' },
  'quick_answer_title': { en: 'Want a quick answer?', ta: 'விரைவான பதில் வேண்டுமா?', hi: 'क्या आप तुरंत उत्तर चाहते हैं?', te: 'శీఘ్ర సమాధానం కావాలా?' },
  'quick_answer_desc': { en: 'Ask the assistant — it knows your local rules.', ta: 'உதவியாளரைக் கேளுங்கள் — அதற்கு உங்கள் உள்ளூர் விதிகள் தெரியும்.', hi: 'सहायक से पूछें — वह आपके स्थानीय नियमों को जानता है।', te: 'సహాయకుడిని అడగండి — దానికి మీ స్థానిక నియమాలు తెలుసు.' },
  'ask_btn': { en: 'Ask', ta: 'கேள்', hi: 'पूछें', te: 'అడగండి' },
  'browse_category': { en: 'BROWSE BY CATEGORY', ta: 'வகை மூலம் உலாவுக', hi: 'श्रेणी के अनुसार ब्राउज़ करें', te: 'వర్గం ద్వారా బ్రౌజ్ చేయండి' },
  'speed_limits': { en: 'Speed & limits', ta: 'வேகம் & வரம்புகள்', hi: 'गति और सीमाएं', te: 'వేగం & పరిమితులు' },
  'safety_gear': { en: 'Safety gear', ta: 'பாதுகாப்பு உபகரணங்கள்', hi: 'सुरक्षा उपकरण', te: 'భద్రతా గేర్' },
  'lane_overtaking': { en: 'Lane & overtaking', ta: 'பாதை & முந்துதல்', hi: 'लेन और ओवरटेकिंग', te: 'లేన్ & ఓవర్‌టేకింగ్' },
  'signal_signage': { en: 'Signal & signage', ta: 'சிக்னல் & பலகைகள்', hi: 'सिग्नल और साइनेज', te: 'సిగ్నల్ & సంకేతాలు' },
  'documents_paperwork': { en: 'Documents & paperwork', ta: 'ஆவணங்கள் & வதந்தி', hi: 'दस्तावेज़', te: 'పత్రాలు' },
  'dui_substance': { en: 'DUI & substance', ta: 'DUI & போதைப் பொருள்', hi: 'नशा और ड्राइविंग (DUI)', te: 'DUI & మాదకద్రవ్యాలు' },
  'rules_count': { en: 'rules', ta: 'விதிகள்', hi: 'नियम', te: 'నియమాలు' },

  // Map Screen
  'schools': { en: 'Schools', ta: 'பள்ளிகள்', hi: 'स्कूल', te: 'పాఠశాలలు' },
  'hospitals': { en: 'Hospitals', ta: 'மருத்துவமனைகள்', hi: 'अस्पताल', te: 'ఆసుపత్రులు' },
  'petrol_pumps': { en: 'Petrol Pumps', ta: 'பெட்ரோல் பம்புகள்', hi: 'पेट्रोल पंप', te: 'పెట్రోల్ పంపులు' },
  'mechanic_sheds': { en: 'Mechanic Sheds', ta: 'மெக்⟐கன் கடைகள்', hi: 'मैकेनिक शेड', te: 'మెకానిక్ షెడ్లు' },
  'general_driving_zone': { en: 'General Driving Zone', ta: 'பொது ஓட்டுநர் மண்டலம்', hi: 'सामान्य ड्राइविंग ज़ोन', te: 'సాధారణ డ్రైవింగ్ జోన్' },
};

interface SettingsContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  t: (key: string, params?: Record<string, string>) => string;
  initialized: boolean;
  hasCompletedOnboarding: boolean;
  completeOnboarding: () => Promise<void>;
  sharedLocation: SharedLocation;
  setSharedLocation: React.Dispatch<React.SetStateAction<SharedLocation>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [profile, setProfileState] = useState<UserProfile>({
    name: 'Sripathi',
    avatar: 'S',
    drivingSince: '2021',
    country: 'India',
    state: 'Tamil Nadu',
    emergencyContact: '',
    emergencyContactName: '',
  });
  const [notificationsEnabled, setNotificationsEnabledState] = useState(true);
  const [selectedVehicleId, setSelectedVehicleIdState] = useState<string | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sharedLocation, setSharedLocation] = useState<SharedLocation>({
    latitude: 13.0827,
    longitude: 80.2707,
    speedLimit: 50,
    zoneType: 'general',
    helmetRequired: true,
    placeName: 'Chennai',
    regionName: 'Tamil Nadu',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('user_language');
      const savedProfile = await AsyncStorage.getItem('user_profile');
      const savedNotifications = await AsyncStorage.getItem('notifications_enabled');
      const savedVehicle = await AsyncStorage.getItem('selected_vehicle_id');
      const savedOnboarding = await AsyncStorage.getItem('onboarding_completed');

      if (savedLang && ['en', 'ta', 'hi', 'te'].includes(savedLang)) {
        setLanguageState(savedLang as Language);
      }
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.name === 'Driver name') {
          parsed.name = 'Sripathi';
          parsed.avatar = 'S';
          await AsyncStorage.setItem('user_profile', JSON.stringify(parsed));
        }
        setProfileState(parsed);
      }
      if (savedNotifications !== null) {
        setNotificationsEnabledState(savedNotifications === 'true');
      }
      if (savedVehicle) {
        setSelectedVehicleIdState(savedVehicle);
      }
      if (savedOnboarding === 'true') {
        setHasCompletedOnboarding(true);
      }
    } catch (e) {
      console.error('Failed to load settings', e);
    } finally {
      setInitialized(true);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('user_language', lang);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    const newProfile = { ...profile, ...updates };
    setProfileState(newProfile);
    await AsyncStorage.setItem('user_profile', JSON.stringify(newProfile));
  };

  const setNotificationsEnabled = async (enabled: boolean) => {
    setNotificationsEnabledState(enabled);
    await AsyncStorage.setItem('notifications_enabled', enabled ? 'true' : 'false');
  };

  const setSelectedVehicleId = async (id: string | null) => {
    setSelectedVehicleIdState(id);
    if (id) {
      await AsyncStorage.setItem('selected_vehicle_id', id);
    } else {
      await AsyncStorage.removeItem('selected_vehicle_id');
    }
  };

  const completeOnboarding = async () => {
    setHasCompletedOnboarding(true);
    await AsyncStorage.setItem('onboarding_completed', 'true');
  };

  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[key]?.[language] ?? translations[key]?.['en'] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    text = text.replace('{name}', profile.name);
    return text;
  };

  return (
    <SettingsContext.Provider
      value={{
        language,
        setLanguage,
        profile,
        updateProfile,
        notificationsEnabled,
        setNotificationsEnabled,
        selectedVehicleId,
        setSelectedVehicleId,
        hasCompletedOnboarding,
        completeOnboarding,
        t,
        initialized,
        sharedLocation,
        setSharedLocation,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
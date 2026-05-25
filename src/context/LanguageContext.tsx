import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Language = 'English' | 'Somali';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  English: {
    // General UI
    welcome: 'Welcome',
    login: 'Log In',
    signup: 'Sign Up',
    logout: 'Log Out',
    cancel: 'Cancel',
    save: 'Save',
    edit: 'Edit',
    settings: 'Settings',
    notifications: 'Notifications',
    profile: 'Profile',
    language: 'Language',
    clear_all: 'Clear All',
    no_notifications: 'No notifications yet',
    notifications_desc: "We'll notify you about urgent requests and messages.",
    search_placeholder: 'Search by location or type...',
    loading_requests: 'Loading requests...',
    no_requests_found: 'No requests found',
    no_requests_desc: 'There are no active blood requests for this filter.',
    donate_now: 'Donate Now',
    share: 'Share',
    delete_request_title: 'Delete Request?',
    delete_request_desc: 'Are you sure you want to delete this blood request? This cannot be undone.',
    yes_delete: 'Yes, Delete Request',
    push_notifications: 'Push Notifications',
    security: 'Security',
    privacy_policy: 'Privacy Policy',
    help_center: 'Help Center',
    about_app: 'About SomaliBD',
    theme_preference: 'Theme Preference',
    reset_to_system: 'Reset to System',
    close: 'Close',
    skip: 'Skip',
    next: 'Next',
    get_started: 'Get Started',
    home: 'Home',
    requests: 'Requests',
    post_request: 'Request',
    chats: 'Chats',
    
    // Dashboard
    hi: 'Hi',
    welcome_app: 'Welcome to SomaliBD app',
    donate_blood: 'Donate Blood',
    save_life: 'Save Life',
    find_donors: 'Find Donors',
    request_blood: 'Request Blood',
    blood_orders: 'Blood Orders',
    ambulances: 'Ambulances',
    
    // Sidebar & Navigation
    dashboard: 'Dashboard',
    my_profile: 'My Profile',
    blood_requests: 'Blood Requests',
    dark_mode: 'Dark Mode',
    light_mode: 'Light Mode',
    blood_type: 'BLOOD TYPE',
    
    // Profile
    donation_history: 'Donation History',
    see_all: 'See All',
    donations_stat: 'DONATIONS',
    status_stat: 'STATUS',
    active_status: 'Active',
    edit_profile: 'Edit Profile',
    
    // Create Request
    need_blood: 'Need Blood?',
    fill_details: 'Fill in the details to reach donors in your region.',
    select_blood_type: 'Select Blood Type Needed',
    region: 'REGION',
    select_region: 'Select Region',
    phone_number: 'PHONE NUMBER',
    urgency_level: 'URGENCY LEVEL',
    submit_request: 'Submit Request',
    send_request: 'Send Request',
    important_notice: 'Important Notice',
    notice_desc: 'Your request will be broadcasted to eligible donors in the selected region. Keep contact details accurate.',
    select_region_title: 'Select Region',
    
    // Onboarding (using the keys from OnboardingScreen)
    onboarding_1_title: 'Welcome to SomaliBD',
    onboarding_1_desc: 'The first dedicated blood donation platform for the Somali community. Connecting heroes with those in need.',
    onboarding_2_title: 'Find Blood Donors',
    onboarding_2_desc: 'Connect with thousands of registered donors in your region instantly. Search by blood type and location.',
    onboarding_3_title: 'Save Lives Together',
    onboarding_3_desc: 'Be a hero in your community. Every donation counts towards saving a life in Somalia.',
    
    // Compatibility for older keys
    onboarding_title_1: 'Save Lives',
    onboarding_desc_1: 'Connect with blood donors in your area and help those in urgent need.',
    onboarding_title_2: 'Fast & Easy',
    onboarding_desc_2: 'Request blood or volunteer to donate with just a few taps.',
    onboarding_title_3: 'Community',
    onboarding_desc_3: 'Join our community of heroes and make a difference today.',
  },
  Somali: {
    // General UI
    welcome: 'Ku soo dhawaada',
    login: 'Soo gal',
    signup: 'Is diwaangeli',
    logout: 'Ka bax',
    cancel: 'Tirtir',
    save: 'Keydi',
    edit: 'Beddel',
    settings: 'Settings',
    notifications: 'Ogeysiisyada',
    profile: 'Profile-ka',
    language: 'Luqadda',
    clear_all: 'Tirtir Dhammaan',
    no_notifications: 'Weli ma jiraan ogeysiisyo',
    notifications_desc: 'Waxaan kugu soo ogeysiin doonaa codsiyada degdegga ah iyo fariimaha.',
    search_placeholder: 'Ka raadi meesha ama nooca...',
    loading_requests: 'Soo raryaya codsiyada...',
    no_requests_found: 'Codsiyo lama helin',
    no_requests_desc: 'Ma jiraan codsiyo dhiig oo firfircoon.',
    donate_now: 'Hadda dhiig bixi',
    share: 'La wadaag',
    delete_request_title: 'Ma tirtirtaa codsiga?',
    delete_request_desc: 'Ma hubtaa inaad tirtirto codsigan dhiigga? Tan dib looma soo celin karo.',
    yes_delete: 'Haa, Tirtir Codsiga',
    push_notifications: 'Ogeysiisyada Push-ka',
    security: 'Amniga',
    privacy_policy: 'Siyaasadda Khaaska ah',
    help_center: 'Xarunta Caawinta',
    about_app: 'Ku saabsan SomaliBD',
    theme_preference: 'Dookha Mawduuca',
    reset_to_system: 'Dib ugu celi Nidaamka',
    close: 'Xir',
    skip: 'Dhaaf',
    next: 'Xigta',
    get_started: 'Bilow',
    home: 'Hoyga',
    requests: 'Codsiyada',
    post_request: 'Codsi',
    chats: 'Fariimaha',
    
    // Dashboard
    hi: 'Hayow',
    welcome_app: 'Ku soo dhawaada SomaliBD app',
    donate_blood: 'Hadda dhiig bixi',
    save_life: 'Badbaadi Nolol',
    find_donors: 'Raadi Deeq Bixiyayaal',
    request_blood: 'Codso Dhiig',
    blood_orders: 'Dalabyada Dhiigga',
    ambulances: 'Ambalaasyada',
    
    // Sidebar & Navigation
    dashboard: 'Dashboard',
    my_profile: 'Profile-kayga',
    blood_requests: 'Codsiyada Dhiigga',
    dark_mode: 'Habka Habeenka',
    light_mode: 'Habka Maalinta',
    blood_type: 'NOOCA DHIIGGA',
    
    // Profile
    donation_history: 'Taariikhda Tabarucaadka',
    see_all: 'Arag Dhammaan',
    donations_stat: 'TABARUCAADKA',
    status_stat: 'XALADDA',
    active_status: 'Firfircoon',
    edit_profile: 'Beddel Profile-ka',
    
    // Create Request
    need_blood: 'Ma u baahan tahay Dhiig?',
    fill_details: 'Buuxi faahfaahinta si aad u gaarto deeq bixiyayaasha gobolkaaga.',
    select_blood_type: 'Dooro Nooca Dhiigga ee loo baahan yahay',
    region: 'GOBOLKA',
    select_region: 'Dooro Gobolka',
    phone_number: 'NAMBARKA TELEFOONKA',
    urgency_level: 'XALADDA DEGDEGGIISA',
    submit_request: 'Gudbi Codsiga',
    send_request: 'Dir Codsiga',
    important_notice: 'Ogeysiis Muhiim ah',
    notice_desc: 'Codsigaaga waxaa loo diri doonaa deeq bixiyayaasha u qalma ee gobolka la doortay. Hubi in faahfaahinta xiriirku ay sax tahay.',
    select_region_title: 'Dooro Gobolka',
    
    // Onboarding
    onboarding_1_title: 'Ku soo dhawaada SomaliBD',
    onboarding_1_desc: 'Madal u gaar ah dhiig bixinta ee bulshada Soomaaliyeed. Isku xirka geesiyaasha iyo kuwa u baahan.',
    onboarding_2_title: 'Raadi Dhiig Bixiyeyaasha',
    onboarding_2_desc: 'Isla markiiba la xiriir kumanaan dhiig bixiyeyaal ah oo ka diiwaangashan gobolkaaga. Raadi nooca dhiigga iyo goobta.',
    onboarding_3_title: 'Badbaadiya Nolosha Wadajir',
    onboarding_3_desc: 'Noqo geesi ka mid ah bulshadaada. Tabarucaad kasta wuxuu gacan ka geystaa badbaadinta nolosha Soomaaliya.',
    
    // Compatibility for older keys
    onboarding_title_1: 'Naf badbaadi',
    onboarding_desc_1: 'La xiriir deeq bixiyayaasha dhiigga ee agagaarkaaga oo caawi kuwa u baahan.',
    onboarding_title_2: 'Si fudud oo dhaqso leh',
    onboarding_desc_2: 'Codso dhiig ama si mutadawacnimo ah ugu deeq dhowr taabasho oo kaliya.',
    onboarding_title_3: 'Bulshada',
    onboarding_desc_3: 'Ku soo biir bulshadeena geesiyaasha ah oo isbedel samee maanta.',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('English');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('user_language');
      if (saved === 'Somali' || saved === 'English') {
        setLanguageState(saved as Language);
      }
    })();
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('user_language', lang);
  };

  const t = (key: string) => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

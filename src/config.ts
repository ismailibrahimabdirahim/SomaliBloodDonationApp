import Constants from 'expo-constants';

/** 
 * Dynamically determines the API URL based on the host running the Expo bundler.
 * This ensures the app works across different networks without manual IP updates.
 */

const getApiUrl = () => {
  // Constants.expoConfig?.hostUri typically looks like "192.168.1.10:8081"
  const debuggerHost = Constants.expoConfig?.hostUri;

  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    // Use the detected IP, but fallback to the known stable IP if needed
    if (ip.includes('exp.direct') || ip.includes('ngrok')) {
      console.log('[Config] Tunnel detected, using stable local IP: 192.168.8.122');
      return `http://192.168.8.122:3000`;
    }
    const url = `http://${ip}:3000`;
    console.log(`[Config] API_URL set to: ${url}`);
    return url;
  }

  const defaultUrl = 'http://10.0.2.2:3000';
  console.log(`[Config] API_URL set to default: ${defaultUrl}`);
  return defaultUrl;
};

export const API_URL = getApiUrl();
export const SOCKET_URL = API_URL;
export const AGORA_APP_ID = '8f9beaa9121040f8aaa3f049bbf9081c';
export const SIMULATE_CALLS = true; // Set to true to allow testing in Expo Go without crashing

export const APP_NAME = 'SomaliBD';
export const DEFAULT_REGION = 'Banaadir';

export const REGIONS = [
  'Banaadir',
  'Hiran',
  'Galgaduud',
  'Mudug',
  'Lower Shabelle',
  'Middle Shabelle',
  'Lower Juba',
  'Middle Juba',
  'Gedo',
  'Bay',
  'Bakool',
  'Bari',
  'Nugaal',
  'Sool',
  'Sanaag',
  'Togdheer',
  'Sahil',
  'Awdal',
];

export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

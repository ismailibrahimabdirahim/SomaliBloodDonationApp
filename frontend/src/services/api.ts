import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

let authToken: string | null = null;

export const setApiToken = (token: string | null) => {
  authToken = token;
};

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true' // Bypass localtunnel browser reminder
  },
  timeout: 20000,
});

api.interceptors.request.use(async (config) => {
  // Try memory first for speed
  let token = authToken;

  if (!token) {
    token = await AsyncStorage.getItem('token');
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

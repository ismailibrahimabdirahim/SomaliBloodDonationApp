import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { Audio } from 'expo-av';
import { Vibration } from 'react-native';
import { SOCKET_URL } from '../config';
import { useAuth } from './AuthContext';
import { rootNavigationRef } from '../navigation/navigationRef';

type CallCtx = {
  isSocketConnected: boolean;
  socket: Socket | null;
  playRingtone: () => Promise<void>;
  stopRingtone: () => Promise<void>;
};

const Ctx = createContext<CallCtx | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const ringtoneRef = React.useRef<Audio.Sound | null>(null);

  useEffect(() => {
    // Preload ringtone on mount
    const preload = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        }).catch(() => {});

        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/freesound_community-ring-tone-68676.mp3'),
          { isLooping: true, volume: 1.0 }
        );
        ringtoneRef.current = sound;
      } catch (e) {
        console.warn('[CallContext] Ringtone preload failed:', e);
      }
    };
    preload();

    return () => {
      if (ringtoneRef.current) {
        ringtoneRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const playRingtone = async () => {
    try {
      if (ringtoneRef.current) {
        // Stop any existing playback first to ensure we start from the beginning
        await ringtoneRef.current.stopAsync().catch(() => {});
        await ringtoneRef.current.setPositionAsync(0).catch(() => {});
        await ringtoneRef.current.playAsync().catch(() => {});
      } else {
        // Fallback: load and play immediately if not preloaded
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/freesound_community-ring-tone-68676.mp3'),
          { shouldPlay: true, isLooping: true, volume: 1.0 }
        );
        ringtoneRef.current = sound;
      }
    } catch (e) {
      console.warn('[CallContext] Play ringtone failed:', e);
    }
  };

  const stopRingtone = async () => {
    try {
      Vibration.cancel();
      if (ringtoneRef.current) {
        await ringtoneRef.current.stopAsync().catch(() => {});
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const s = io(SOCKET_URL, { 
      transports: ['websocket'],
    });

    s.on('connect', () => {
      setIsSocketConnected(true);
      s.emit('join', user.email);
    });

    s.on('disconnect', () => {
      setIsSocketConnected(false);
    });

    s.on('callRequest', (data) => {
      console.log('[Global] Incoming call request:', data);
      Vibration.vibrate([500, 1000, 500, 1000], true);
      if (rootNavigationRef.isReady()) {
        // @ts-ignore
        rootNavigationRef.navigate('Call', {
          mode: 'incoming',
          type: data.type || 'audio',
          otherUserEmail: data.from,
          otherUserName: data.fromName,
          channel: data.channel,
          incomingCallData: data
        });
      }
    });

    s.on('newMessage', (data) => {
      // Check if we should show a global notification banner
      // We check if navigation is ready and if we're NOT already in that chat
      if (rootNavigationRef.isReady()) {
        const state = rootNavigationRef.getRootState();
        const currentRoute = state?.routes[state.index];
        const isCurrentlyInChatWithSender = 
          currentRoute?.name === 'Chat' && 
          (currentRoute.params as any)?.recipientEmail === data.sender;

        if (!isCurrentlyInChatWithSender && data.sender !== user.email) {
          // Show a clear in-app notification
          // Assuming useAlert is available or we can use Alert.alert
          // Since we are in a context, we can't easily use useAlert hook from another context if not shared
          // But we can use rootNavigation to show a Toast or similar if implemented
          console.log('[Global] New message from:', data.senderName || data.sender);
        }
      }
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [isAuthenticated, user?.email]);

  return (
    <Ctx.Provider value={{ isSocketConnected, socket, playRingtone, stopRingtone }}>
      {children}
    </Ctx.Provider>
  );
}

export function useGlobalCall() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useGlobalCall outside CallProvider');
  return v;
}

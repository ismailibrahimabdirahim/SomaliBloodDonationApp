import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Platform,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PhoneOff,
  Phone,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  SwitchCamera,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme, palette } from '../../theme/colors';
import { api } from '../../services/api';
import { AGORA_APP_ID, SIMULATE_CALLS } from '../../config';
import type { RootStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import { useGlobalCall } from '../../context/CallContext';

// Remove local socket, use global instead
// const socket = io(SOCKET_URL, { transports: ['websocket'] });
const { width, height } = Dimensions.get('window');

type Props = NativeStackScreenProps<RootStackParamList, 'Call'>;

export default function CallScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { socket, playRingtone, stopRingtone } = useGlobalCall();
  const [logged, setLogged] = useState(false);
  const streamInterval = useRef<any>(null);
  const recordingRef = useRef<any>(null);
  const soundRef = useRef<any>(null);
  const {
    type: callType,
    mode,
    otherUserEmail,
    otherUserName,
    channel,
    incomingCallData,
  } = route.params;

  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>('ringing');
  const statusRef = useRef(callStatus);
  useEffect(() => { statusRef.current = callStatus; }, [callStatus]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(callType === 'video');
  const [remoteUid, setRemoteUid] = useState<number>(0);
  const [callTimer, setCallTimer] = useState(0);
  const [isLocalMain, setIsLocalMain] = useState(false);
  const agoraEngineRef = useRef<any>(null);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    initCall();
    return () => {
      endCallActions();
    };
  }, []);


  const initCall = async () => {
    if (!socket) return;
    
    // Request permissions
    if (callType === 'video') {
      const { status: camStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: micStatus } = await Audio.requestPermissionsAsync();
      if (camStatus !== 'granted' || micStatus !== 'granted') {
        console.warn('Permissions not granted');
      }
    } else {
      await Audio.requestPermissionsAsync();
    }

    // Play ringtone
    playRingtone();

    if (mode === 'outgoing') {
      socket.emit('callRequest', {
        from: user?.email,
        fromName: user?.name,
        to: otherUserEmail,
        channel,
        type: callType,
      });
    }

    await setupAgora();

    // Socket listeners
    socket.on('callAccepted', (data) => {
      if (data.from === otherUserEmail) {
        startConnectedCall();
      }
    });

    socket.on('callEnded', () => {
      setCallStatus('ended');
      stopStreaming();
      logCallEnd();
      setTimeout(() => navigation.goBack(), 1500);
    });

    socket.on('voiceStream', async (data) => {
      if (data.from !== user?.email && statusRef.current === 'connected') {
        try {
          const fileUri = `${(FileSystem as any).cacheDirectory}stream_${Date.now()}.m4a`;
          await FileSystem.writeAsStringAsync(fileUri, data.audio, { encoding: (FileSystem as any).EncodingType.Base64 });
          const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
          soundRef.current = sound;
        } catch (e) {}
      }
    });
  };

  const setupAgora = async () => {
    if (SIMULATE_CALLS) {
      console.log('[Simulation] Bypassing Agora setup');
      return;
    }
    try {
      const { createAgoraRtcEngine, ChannelProfileType } = require('react-native-agora');
      const engine = createAgoraRtcEngine();
      agoraEngineRef.current = engine;
      engine.initialize({ appId: AGORA_APP_ID });
      engine.setChannelProfile(ChannelProfileType.ChannelProfileCommunication);
      
      if (callType === 'video') {
        engine.enableVideo();
        engine.startPreview();
      } else {
        engine.enableAudio();
      }

      engine.registerEventHandler({
        onJoinChannelSuccess: () => {
          console.log('Joined channel successfully');
          setCallStatus('connected');
        },
        onUserJoined: (connection: any, uid: number) => {
          setRemoteUid(uid);
          setCallStatus('connected');
        },
        onUserOffline: () => {
          setCallStatus('ended');
          logCallEnd();
          setTimeout(() => navigation.goBack(), 1000);
        },
        onLeaveChannel: () => {
          setRemoteUid(0);
        },
      });

      engine.joinChannel('', channel, 0, {});
    } catch (e) {
      console.warn('Agora setup error:', e);
    }
  };

  // Removed redundant playRingtone as it's handled by preloadRingtone

  const acceptCall = () => {
    socket?.emit('callAccepted', {
      to: otherUserEmail,
      from: user?.email,
      channel,
    });
    startConnectedCall();
  };

  const startConnectedCall = async () => {
    setCallStatus('connected');
    stopRingtone();
    
    // Join Agora channel
    if (!SIMULATE_CALLS) {
      const { ClientRoleType } = require('react-native-agora');
      agoraEngineRef.current?.joinChannel('', channel, 0, {
        clientRoleType: ClientRoleType.ClientRoleBroadcaster,
      });
    } else {
      console.log('[Simulation] Bypassing Agora join');
      startStreaming();
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setCallTimer((prev) => prev + 1);
    }, 1000);
  };

  const endCall = async () => {
    socket?.emit('callEnded', { to: otherUserEmail, from: user?.email });
    setCallStatus('ended');
    stopStreaming();
    await logCallEnd();
    setTimeout(() => navigation.goBack(), 1000);
  };

  const logCallEnd = async () => {
    if (logged) return;
    setLogged(true);
    try {
      const durationStr = callStatus === 'connected' ? ` (${formatTime(callTimer)})` : '';
      const statusText = callStatus === 'connected' ? 'Call ended' : 'Missed call';
      await api.post('/api/messages', {
        text: `[CALL_LOG]: ${callType === 'video' ? 'Video' : 'Voice'} ${statusText}${durationStr}`,
        recipient: otherUserEmail,
        type: 'text'
      });
    } catch (e) {
      console.warn('Failed to log call end:', e);
    }
  };

  const endCallActions = async () => {
    stopRingtone();
    if (!SIMULATE_CALLS) {
      agoraEngineRef.current?.leaveChannel();
      agoraEngineRef.current?.release();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    socket?.off('callAccepted');
    socket?.off('callEnded');
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (!SIMULATE_CALLS) agoraEngineRef.current?.muteLocalAudioStream(next);
  };

  const toggleVideo = () => {
    const next = !isVideoEnabled;
    setIsVideoEnabled(next);
    if (!SIMULATE_CALLS) agoraEngineRef.current?.muteLocalVideoStream(!next);
  };

  const switchCamera = () => {
    agoraEngineRef.current?.switchCamera();
  };

  const startStreaming = async () => {
    if (!SIMULATE_CALLS) return;
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      streamInterval.current = setInterval(async () => {
        try {
          const currentRec: any = recordingRef.current;
          if (currentRec) {
            await currentRec.stopAndUnloadAsync();
            const uri = currentRec.getURI();
            if (uri && socket && user?.email && otherUserEmail) {
              const base64 = await FileSystem.readAsStringAsync(uri, { encoding: (FileSystem as any).EncodingType.Base64 });
              socket.emit('voiceStream', { audio: base64, from: user.email, to: otherUserEmail });
            }
          }
          const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.LOW_QUALITY);
          recordingRef.current = recording;
        } catch (e) {}
      }, 3000);
    } catch (e) {}
  };

  const stopStreaming = () => {
    if (streamInterval.current) clearInterval(streamInterval.current);
    recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    soundRef.current?.unloadAsync().catch(() => {});
  };

  const toggleSpeaker = async () => {
    Vibration.vibrate(50);
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    // In React Native Agora 4.x, speaker control is via setEnableSpeakerphone
    if (!SIMULATE_CALLS) agoraEngineRef.current?.setEnableSpeakerphone(next);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.bloodRed }]}>
      <StatusBar barStyle="light-content" />
      
      {/* Main Video View */}
      <View style={StyleSheet.absoluteFill}>
        {callType === 'video' && callStatus === 'connected' ? (
          isLocalMain ? (
            // Local User is Large
            !SIMULATE_CALLS ? (
              (() => {
                const { RtcSurfaceView } = require('react-native-agora');
                return <RtcSurfaceView canvas={{ uid: 0 }} style={styles.fullVideo} />;
              })()
            ) : (
              <View style={[styles.fullVideo, { backgroundColor: '#333' }]}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${user?.name || 'Me'}&background=075E54&color=fff&size=512` }} style={styles.fullAvatar} />
                <Text style={styles.mockLabel}>SIMULATED LOCAL VIEW</Text>
              </View>
            )
          ) : (
            // Remote User is Large
            remoteUid !== 0 && !SIMULATE_CALLS ? (
              (() => {
                const { RtcSurfaceView } = require('react-native-agora');
                return <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.fullVideo} />;
              })()
            ) : (
              <View style={styles.audioBg}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${otherUserName}&background=random&size=200` }} style={styles.avatar} />
                {SIMULATE_CALLS && <Text style={styles.mockLabel}>SIMULATED REMOTE VIEW</Text>}
              </View>
            )
          )
        ) : (
          // Default Background (Audio or Ringing)
          <View style={styles.audioBg}>
            <Image source={{ uri: `https://ui-avatars.com/api/?name=${otherUserName}&background=random&size=200` }} style={styles.avatar} />
          </View>
        )}
      </View>

      {/* Picture-in-Picture (PIP) View */}
      {callType === 'video' && callStatus === 'connected' && (
        <TouchableOpacity 
          style={styles.localVideoContainer} 
          onPress={() => setIsLocalMain(!isLocalMain)}
          activeOpacity={0.9}
        >
          {isLocalMain ? (
            // Remote User is Small
            remoteUid !== 0 && !SIMULATE_CALLS ? (
              (() => {
                const { RtcSurfaceView } = require('react-native-agora');
                return <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.pipVideo} zOrderMediaOverlay={true} />;
              })()
            ) : (
              <View style={styles.pipPlaceholder}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${otherUserName}&size=100` }} style={styles.pipAvatar} />
              </View>
            )
          ) : (
            // Local User is Small
            !SIMULATE_CALLS ? (
              (() => {
                const { RtcSurfaceView } = require('react-native-agora');
                return <RtcSurfaceView canvas={{ uid: 0 }} style={styles.pipVideo} zOrderMediaOverlay={true} />;
              })()
            ) : (
              <View style={styles.pipPlaceholder}>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${user?.name || 'Me'}&size=100` }} style={styles.pipAvatar} />
                <Text style={{ fontSize: 8, color: '#666' }}>Camera disabled in Expo Go</Text>
              </View>
            )
          )}
        </TouchableOpacity>
      )}

      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Text style={styles.name}>{otherUserName}</Text>
          <Text style={styles.status}>
            {callStatus === 'ringing' 
              ? (mode === 'incoming' ? 'Incoming Call...' : 'Calling...') 
              : callStatus === 'connected' ? formatTime(callTimer) : 'Call Ended'}
          </Text>
          {SIMULATE_CALLS && (
            <View style={styles.simBadge}>
              <Text style={styles.simText}>DEMO MODE (No Agora ID)</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionBtn, isSpeakerOn && { backgroundColor: 'rgba(255,255,255,0.3)' }]} 
              onPress={toggleSpeaker}
            >
              {isSpeakerOn ? <Volume2 size={28} color="white" /> : <VolumeX size={28} color="white" />}
            </TouchableOpacity>

            {callType === 'video' && (
              <>
                <TouchableOpacity 
                  style={[styles.actionBtn, !isVideoEnabled && styles.activeAction]} 
                  onPress={toggleVideo}
                >
                  {isVideoEnabled ? <Video color="white" /> : <VideoOff color="white" />}
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={switchCamera}>
                  <SwitchCamera color="white" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity 
              style={[styles.actionBtn, isMuted && { backgroundColor: 'rgba(255,255,255,0.3)' }]} 
              onPress={toggleMute}
            >
              {isMuted ? <MicOff color="white" /> : <Mic color="white" />}
            </TouchableOpacity>
          </View>

          <View style={styles.mainActions}>
            {mode === 'incoming' && callStatus === 'ringing' ? (
              <View style={styles.incomingActions}>
                <TouchableOpacity 
                  style={[styles.callBtn, { backgroundColor: palette.green500 }]} 
                  onPress={acceptCall}
                >
                  <Phone color="white" size={32} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.callBtn, { backgroundColor: palette.bloodRed, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]} 
                  onPress={endCall}
                >
                  <PhoneOff color="white" size={32} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity 
                style={[styles.callBtn, { backgroundColor: palette.bloodRed }]} 
                onPress={endCall}
              >
                <PhoneOff color="white" size={32} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  audioBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  avatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 4,
    borderColor: palette.bloodRed,
  },
  localVideoContainer: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 110,
    height: 160,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 100,
  },
  fullVideo: {
    flex: 1,
  },
  pipVideo: {
    flex: 1,
  },
  pipPlaceholder: {
    flex: 1,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pipAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  fullAvatar: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignSelf: 'center',
    marginTop: height * 0.2,
  },
  mockLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 10,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  name: {
    color: 'white',
    fontSize: 32,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  status: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 18,
    marginTop: 10,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 20,
    borderRadius: 30,
  },
  actionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeAction: {
    backgroundColor: 'white',
  },
  mainActions: {
    alignItems: 'center',
  },
  incomingActions: {
    flexDirection: 'row',
    gap: 40,
  },
  callBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
  },
  simBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
  },
  simText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import {
  ArrowLeft,
  Send,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Paperclip,
  Smile,
  Image as ImageIcon,
  Mic,
  Trash2,
  Edit2,
  X,
  Play,
  Pause,
  PhoneOff,
  PhoneIncoming,
  Check,
  MessageCircle,
  Download,
  Share2,
  RotateCcw,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../services/api';
import { SOCKET_URL } from '../../config';
import { useTheme, palette } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import { useAlert } from '../../context/AlertContext';
import { useAuth } from '../../context/AuthContext';
import { CHAT_THEMES } from '../main/PublicProfileScreen';

const socket = io(SOCKET_URL, { transports: ['websocket'] });
const { width, height } = Dimensions.get('window');

type Msg = {
  _id?: string;
  text: string;
  sender: 'me' | 'other';
  time: string;
  status: 'sent' | 'delivered' | 'read';
  isEdited?: boolean;
  type?: 'text' | 'image' | 'audio';
  attachment?: string;
  duration?: number;
  recipient?: string;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

export default function ChatScreen({ route, navigation }: Props) {
  const { colors, isDark } = useTheme();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();
  const { recipientName, recipientEmail } = route.params;

  const [messages, setMessages] = useState<Msg[]>([]);
  const [inputText, setInputText] = useState('');
  const [editingMsg, setEditingMsg] = useState<Msg | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [playingSound, setPlayingSound] = useState<Audio.Sound | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();
  const scrollRef = useRef<ScrollView>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const timerRef = useRef<any>(null);

  const [chatTheme, setChatTheme] = useState<typeof CHAT_THEMES[0]>(CHAT_THEMES[0]);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [showActionModal, setShowActionModal] = useState(false);
  const [activeMsg, setActiveMsg] = useState<Msg | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Generate deterministic channel name from the two participants
  const callChannel = [user?.email || '', recipientEmail].sort().join('__').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64);

  useEffect(() => {
    if (user?.email) socket.emit('join', user.email);
    
    (async () => {
      // Load saved chat theme
      const savedTheme = await AsyncStorage.getItem(`chat_theme_${recipientEmail}`);
      if (savedTheme) {
        const found = CHAT_THEMES.find(t => t.id === savedTheme);
        if (found) setChatTheme(found);
      }
    })();
    return () => {
      if (playingSound) playingSound.unloadAsync();
    };
  }, []);

  // Reload chat theme every time screen is focused (e.g. coming back from PublicProfile)
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(`chat_theme_${recipientEmail}`).then(savedTheme => {
        if (savedTheme) {
          const found = CHAT_THEMES.find(t => t.id === savedTheme);
          if (found) setChatTheme(found);
        } else {
          setChatTheme(CHAT_THEMES[0]);
        }
      });
    }, [recipientEmail])
  );

  const loadMessages = useCallback(async () => {
    if (!user?.email || !recipientEmail) return;
    const cacheKey = `chat_cache_${recipientEmail}`;

    // 1. FASTEST: Immediate UI from Cache
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.length > 0) {
          setMessages(parsed);
          setLoading(false); // Disable loading spinner immediately if we have data
        }
      }
    } catch (e) { }

    // 2. BACKGROUND: Refresh from API
    try {
      const { data } = await api.get(`/api/messages/${encodeURIComponent(recipientEmail)}`);
      const formatted = data.map((msg: any) => ({
        ...msg,
        sender: msg.sender === user?.email ? 'me' : 'other',
        time: new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
      
      setMessages(formatted);
      AsyncStorage.setItem(cacheKey, JSON.stringify(formatted)).catch(() => {});
    } catch (err) {
      console.error("API Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email, recipientEmail]);

  useEffect(() => {
    loadMessages();
    const onNew = (msg: any) => {
      if ((msg.sender === user?.email && msg.recipient === recipientEmail) ||
        (msg.sender === recipientEmail && msg.recipient === user?.email)) {

        const isMe = msg.sender === user?.email;
        const formattedMsg = {
          ...msg,
          sender: isMe ? 'me' : 'other',
          time: new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => {
          if (prev.some(m => m._id === msg._id)) return prev;

          if (isMe) {
            const tempIndex = prev.findIndex(m => String(m._id).startsWith('temp_') && m.text === msg.text && m.type === msg.type);
            if (tempIndex !== -1) {
              const newPrev = [...prev];
              newPrev[tempIndex] = formattedMsg;
              return newPrev;
            }
          }
          return [...prev, formattedMsg];
        });
      }
    };
    const onUpdate = (msg: any) => setMessages(prev => prev.map(m => m._id === msg._id ? { ...m, text: msg.text, isEdited: true } : m));
    const onDelete = (id: string) => setMessages(prev => prev.filter(m => m._id !== id));
    const onRead = ({ reader, sender }: { reader: string, sender: string }) => {
      if (reader === recipientEmail && sender === user?.email) {
        setMessages(prev => prev.map(m => m.sender === 'me' ? { ...m, status: 'read' } : m));
      }
    };

    socket.on('newMessage', onNew);
    socket.on('updateMessage', onUpdate);
    socket.on('deleteMessage', onDelete);
    socket.on('messagesRead', onRead);

    // Mark as read (both API for persistence and socket for real-time)
    const markAsRead = async () => {
      try {
        await api.post('/api/messages/mark-read', { sender: recipientEmail });
        socket.emit('markRead', { sender: recipientEmail, recipient: user?.email });
      } catch (e) {
        console.warn('[Chat] Failed to mark as read:', e);
      }
    };
    markAsRead();

    return () => {
      socket.off('newMessage', onNew);
      socket.off('updateMessage', onUpdate);
      socket.off('deleteMessage', onDelete);
      socket.off('messagesRead', onRead);
    };
  }, [user?.email, recipientEmail, loadMessages]);

  // Persist messages to cache whenever they change
  useEffect(() => {
    if (messages.length > 0 && recipientEmail) {
      AsyncStorage.setItem(`chat_cache_${recipientEmail}`, JSON.stringify(messages))
        .catch(err => console.error("Cache persistence failed:", err));
    }
  }, [messages, recipientEmail]);

  const startCall = async (type: 'audio' | 'video' = 'audio') => {
    // Pre-emptively set audio mode for calling to reduce latency
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});

    // Log call in chat history
    await sendMessage('text', '', 0, `[CALL_LOG]: ${type === 'video' ? 'Video' : 'Voice'} Call started`);

    navigation.navigate('Call', {
      type,
      mode: 'outgoing',
      otherUserEmail: recipientEmail,
      otherUserName: recipientName,
      channel: callChannel
    });
  };

  const sendMessage = async (type: 'text' | 'image' | 'audio' = 'text', attachment = '', duration = 0, textOverride?: string) => {
    const messageText = textOverride || inputText;
    if ((type === 'text' && !messageText.trim()) || !user?.email) return;

    const tempId = `temp_${Math.random().toString()}`;
    const tempMsg: Msg = {
      _id: tempId,
      text: type === 'text' ? messageText : '',
      sender: 'me',
      recipient: recipientEmail,
      type,
      attachment,
      duration,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent'
    };

    try {
      if (editingMsg) {
        await api.put(`/api/messages/${editingMsg._id}`, { text: messageText });
        setEditingMsg(null);
      } else {
        setMessages(prev => [...prev, tempMsg]);
        const { data } = await api.post('/api/messages', { text: type === 'text' ? messageText : '', recipient: recipientEmail, type, attachment, duration });

        const formattedMsg = {
          ...data,
          sender: 'me',
          time: new Date(data.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        setMessages(prev => {
          if (prev.some(m => m._id === data._id)) return prev.filter(m => m._id !== tempId);
          return prev.map(m => m._id === tempId ? formattedMsg : m);
        });
      }
      setInputText('');
      Keyboard.dismiss();
    } catch (err: any) {
      setMessages(prev => prev.filter(m => m._id !== tempId));
      showAlert({ type: 'error', title: 'Error', message: `Failed to send ${type}` });
    }
  };

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.5, base64: true });
      if (!res.canceled && res.assets[0].base64) await sendMessage('image', `data:image/jpeg;base64,${res.assets[0].base64}`);
    } catch (err: any) {
      showAlert({ type: 'error', title: 'Image Error', message: err.message });
    }
  };

  const startRecording = async () => {
    try {
      if (playingSound) { await playingSound.unloadAsync().catch(() => { }); setPlayingSound(null); }

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        showAlert({ type: 'error', title: 'Permission', message: 'Mic permission required' });
        return;
      }

      // STOP ALL sounds and reset audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setIsPaused(false);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch (err: any) {
      console.error("[Voice] Start failed:", err);
      showAlert({ type: 'error', title: 'Error', message: 'Could not start recording' });
    }
  };

  const pauseRecording = async () => {
    if (!recording) return;
    try {
      await recording.pauseAsync();
      setIsPaused(true);
      clearInterval(timerRef.current);
    } catch (err) {}
  };

  const resumeRecording = async () => {
    if (!recording) return;
    try {
      await recording.startAsync();
      setIsPaused(false);
      timerRef.current = setInterval(() => setRecordTime(p => p + 1), 1000);
    } catch (err) {}
  };

  const stopRecording = async () => {
    if (!recording) return null;
    setIsRecording(false);
    setIsPaused(false);
    clearInterval(timerRef.current);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setRecordedUri(uri);
        setRecordedDuration(recordTime);
      }
      setRecording(null);
      // Reset audio mode back to playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true
      }).catch(() => { });
      return uri;
    } catch (err) {
      console.error("[Voice] Stop recording failed:", err);
      setRecording(null);
      return null;
    }
  };

  const sendRecording = async (uriOverride?: string, durationOverride?: number) => {
    const uri = uriOverride || recordedUri;
    const duration = durationOverride !== undefined ? durationOverride : recordedDuration;
    if (!uri) return;
    try {
      const base64 = await (FileSystem as any).readAsStringAsync(uri, { encoding: 'base64' });
      if (base64) {
        await sendMessage('audio', `data:audio/m4a;base64,${base64}`, duration);
      }
      setRecordedUri(null);
    } catch (err) {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to send recording' });
    }
  };

  const handlePauseSend = async () => {
    const currentDuration = recordTime;
    const uri = await stopRecording();
    if (uri) {
      await sendRecording(uri, currentDuration);
    }
  };

  const cancelRecording = async () => {
    setIsRecording(false);
    setIsPaused(false);
    setRecordedUri(null);
    clearInterval(timerRef.current);
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      } catch (err) {}
    }
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true }).catch(() => { });
  };

  const restartRecording = async () => {
    await cancelRecording();
    startRecording();
  };

  const handleLongPress = (msg: Msg) => {
    setActiveMsg(msg);
    setShowActionModal(true);
  };

  const deleteMessage = async (id: string, type: 'me' | 'everyone') => {
    setMessages(prev => prev.filter(m => m._id !== id));
    setSelectedMessageId(null);
    setShowActionModal(false);
    setActiveMsg(null);
    try {
      await api.delete(`/api/messages/${id}?type=${type}`);
    } catch {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to delete on server' });
    }
  };

  const clearChat = async () => {
    try {
      await api.delete(`/api/messages/conversations/${encodeURIComponent(recipientEmail)}`);
      setMessages([]);
      showAlert({ type: 'success', title: 'Deleted', message: 'Chat history deleted' });
    } catch {
      showAlert({ type: 'error', title: 'Error', message: 'Failed to clear chat' });
    }
  };

  const playAudio = async (messageId: string, audioData: string) => {
    if (playingMessageId === messageId && playingSound) { await playingSound.stopAsync(); setPlayingMessageId(null); return; }
    if (playingSound) await playingSound.unloadAsync();
    try {
      setPlayingMessageId(messageId);
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
      let playUri = audioData;
      if (audioData.startsWith('data:')) {
        const filepath = `${(FileSystem as any).cacheDirectory}temp_audio_${messageId}.m4a`;
        await (FileSystem as any).writeAsStringAsync(filepath, audioData.split('base64,')[1], { encoding: 'base64' });
        playUri = filepath;
      }
      const { sound } = await Audio.Sound.createAsync({ uri: playUri });
      setPlayingSound(sound);
      setAudioProgress(0);
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.isLoaded) {
          setAudioProgress(s.positionMillis / (s.durationMillis || 1));
          if (s.didJustFinish) {
            setPlayingMessageId(null);
            setPlayingSound(null);
            setAudioProgress(0);
          }
        }
      });
    } catch {
      setPlayingMessageId(null);
      showAlert({ type: 'error', title: 'Error', message: 'Could not play audio' });
    }
  };

  const saveImage = async (uri: string) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const filename = `Sombdonate_${Date.now()}.jpg`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      let base64 = uri;
      if (uri.startsWith('data:')) {
        base64 = uri.split('base64,')[1];
        await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: 'base64' });
      } else {
        const download = await FileSystem.downloadAsync(uri, fileUri);
        if (download.status !== 200) throw new Error('Download failed');
      }

      Alert.alert('Success', 'Image saved to app storage. (Install expo-media-library for Gallery access)');

    } catch (err: any) {
      showAlert({ type: 'error', title: 'Save Error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>

        <View style={[styles.header, { backgroundColor: palette.bloodRed, paddingTop: insets.top || 10, height: (insets.top || 10) + 60 }]}>
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconPad}><ArrowLeft size={24} color="white" /></TouchableOpacity>
            <TouchableOpacity style={styles.headerInfo} activeOpacity={0.7} onPress={() => navigation.navigate('PublicProfile', { email: recipientEmail, name: recipientName })}>
              <View>
                <Image source={{ uri: `https://ui-avatars.com/api/?name=${recipientName}&background=random` }} style={styles.avatar} />
                <View style={styles.onlineDot} />
              </View>
              <View><Text style={styles.headerTitle}>{recipientName}</Text><Text style={styles.headerSubtitle}>Online</Text></View>
            </TouchableOpacity>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconPad} onPress={() => startCall('audio')}><Phone size={22} color="white" /></TouchableOpacity>
              <TouchableOpacity style={styles.iconPad} onPress={() => startCall('video')}><Video size={22} color="white" /></TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView ref={scrollRef} style={[styles.chatArea, chatTheme.bg ? { backgroundColor: chatTheme.bg } : {}]} contentContainerStyle={styles.chatScroll} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
          {messages.length === 0 && !loading ? (
            <View style={styles.center}><MessageCircle size={48} color={colors.textMuted} /><Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text></View>
          ) : messages.map((msg) => {
            const isMe = msg.sender === 'me';
            const isSelected = selectedMessageId === msg._id;
            return (
              <View key={msg._id || Math.random().toString()} style={[styles.msgRow, isMe ? styles.rowMe : styles.rowThem]}>
                <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleLongPress(msg)}>
                  <View style={[
                    styles.bubble, 
                    isMe ? styles.bubbleMe : styles.bubbleThem,
                    isMe ? { backgroundColor: chatTheme.bubbleColor || '#E7FFDB' } : { backgroundColor: '#FFFFFF' },
                    (msg.type === 'image') && { padding: 0, overflow: 'hidden' }
                  ]}>
                    {msg.type === 'image' ? (
                      <TouchableOpacity 
                        onPress={() => setViewerImage(msg.attachment || null)}
                        onLongPress={() => handleLongPress(msg)}
                        activeOpacity={0.9}
                      >
                        <Image source={{ uri: msg.attachment }} style={styles.msgImg} />
                      </TouchableOpacity>
                    ) :
                      msg.type === 'audio' ? (
                        <TouchableOpacity 
                          style={styles.audioBubble} 
                          onPress={() => playAudio(msg._id || '', msg.attachment || '')}
                          onLongPress={() => handleLongPress(msg)}
                        >
                          {playingMessageId === msg._id ? <ActivityIndicator size="small" color="#075E54" /> : <Play size={22} color="#075E54" fill="#075E54" />}
                          <View style={styles.waveContainer}>
                            <View style={[styles.wave, { backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : '#ddd' }]} />
                            {playingMessageId === msg._id && (
                              <View style={[styles.waveProgress, { width: `${Math.min(audioProgress * 100, 100)}%`, backgroundColor: '#075E54' }]} />
                            )}
                          </View>
                          <Text style={[styles.audioTime, { color: 'rgba(0,0,0,0.5)' }]}>{Math.round(msg.duration || 0)}s</Text>
                        </TouchableOpacity>
                      ) : msg.text.startsWith('[CALL_LOG]:') ? (
                        <TouchableOpacity 
                          style={styles.callBubble} 
                          activeOpacity={0.8}
                          onPress={() => {
                            const isVideo = msg.text.includes('Video');
                            const type = isVideo ? 'Video' : 'Voice';
                            Alert.alert(
                              `${type} Call Back?`,
                              `Do you want to call ${recipientName} back?`,
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Call', onPress: () => startCall(isVideo ? 'video' : 'audio') }
                              ]
                            );
                          }}
                          onLongPress={() => handleLongPress(msg)}
                        >
                          <View style={[styles.callIconCircle, { backgroundColor: msg.text.includes('Missed') ? '#FFEBEB' : '#E7FFDB' }]}>
                            {msg.text.includes('Video') ? (
                              <Video size={20} color={msg.text.includes('Missed') ? palette.bloodRed : '#075E54'} />
                            ) : (
                              <Phone size={20} color={msg.text.includes('Missed') ? palette.bloodRed : '#075E54'} />
                            )}
                          </View>
                          <View style={styles.callInfo}>
                            <Text style={[styles.callTypeTitle, { color: msg.text.includes('Missed') ? palette.bloodRed : '#000' }]}>
                              {msg.text.includes('Video') ? 'Video Call' : 'Voice Call'}
                            </Text>
                            <Text style={styles.callStatusSub}>
                              {msg.text.includes('Missed') ? 'Missed' : msg.text.includes('ended') ? 'Call ended' : 'Outgoing'}
                              {msg.text.includes('(') ? ` • ${msg.text.split('(')[1].split(')')[0]}` : ''}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ) : <Text style={[styles.msgText, { color: '#000' }]}>{msg.text}</Text>}
                    <View style={styles.msgFooter}>
                      {msg.isEdited && <Text style={[styles.editedText, { color: 'rgba(0,0,0,0.45)' }]}>Edited • </Text>}
                      <Text style={[styles.msgTime, { color: 'rgba(0,0,0,0.45)' }]}>{msg.time}</Text>
                      {isMe && (
                        msg.status === 'read' ? (
                          <CheckCheck size={14} color="#34B7F1" />
                        ) : msg.status === 'delivered' ? (
                          <CheckCheck size={14} color="rgba(0,0,0,0.3)" />
                        ) : (
                          <Check size={14} color="rgba(0,0,0,0.3)" />
                        )
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: colors.background, paddingBottom: insets.bottom || 10 }]}>
          {isRecording || recordedUri ? (
            <View style={styles.recordBar}>
              <View style={styles.recordInfo}>
                <Mic size={24} color={palette.bloodRed} />
                <Text style={[styles.recordTime, { color: colors.text }]}>{isRecording ? recordTime : recordedDuration}s</Text>
              </View>
              <Text style={styles.recordHint}>{isRecording ? 'Recording...' : 'Recording stopped'}</Text>
              <View style={styles.recordActions}>
                {isPaused && (
                  <TouchableOpacity onPress={resumeRecording} style={styles.recordStop}>
                    <Play size={24} color="white" fill="white" />
                  </TouchableOpacity>
                )}
                {!isRecording && !isPaused && (
                  <TouchableOpacity onPress={restartRecording} style={styles.recordCancel}>
                    <RotateCcw size={20} color="#666" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={cancelRecording} style={styles.recordCancel}>
                  <Trash2 size={20} color="#666" />
                </TouchableOpacity>
                {isRecording && !isPaused ? (
                  <TouchableOpacity onPress={pauseRecording} style={styles.recordStop}>
                    <Pause size={24} color="white" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={isPaused ? handlePauseSend : () => sendRecording()} style={styles.recordSend}>
                    <Send size={20} color="white" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <View style={styles.inputBar}>
              <TouchableOpacity style={styles.inputIconLeft}><Smile size={26} color={colors.text} /></TouchableOpacity>
              <TouchableOpacity onPress={pickImage} style={styles.inputIconLeft}><Paperclip size={24} color={colors.text} /></TouchableOpacity>
              <View style={[styles.inputBox, { backgroundColor: '#F0F2F5', borderColor: 'transparent' }]}>
                <TextInput style={[styles.input, { color: '#000' }]} placeholder="Type a message..." placeholderTextColor="#666" value={inputText} onChangeText={setInputText} multiline />
                {editingMsg ? (
                  <TouchableOpacity onPress={() => { setEditingMsg(null); setInputText(''); }}><X size={18} color={palette.bloodRed} /></TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={pickImage}><ImageIcon size={22} color="#666" /></TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: palette.bloodRed }]}
                onPress={() => (inputText.trim() ? sendMessage() : recordedUri ? sendRecording() : startRecording())}
              >
                {inputText.trim() || recordedUri ? <Send size={20} color="white" style={{ marginLeft: 3 }} /> : <Mic size={22} color="white" />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Image Viewer Modal */}
      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={styles.viewerContainer}>
          <SafeAreaView style={styles.viewerHeader}>
            <TouchableOpacity onPress={() => setViewerImage(null)} style={styles.viewerClose}>
              <X size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => viewerImage && saveImage(viewerImage)}
              style={styles.viewerClose}
              disabled={isSaving}
            >
              {isSaving ? <ActivityIndicator size="small" color="white" /> : <Download size={26} color="white" />}
            </TouchableOpacity>
          </SafeAreaView>
          <Image source={{ uri: viewerImage || '' }} style={styles.viewerFull} resizeMode="contain" />
        </View>
      </Modal>

      {/* Message Action Menu Modal */}
      <Modal visible={showActionModal} transparent animationType="slide" onRequestClose={() => setShowActionModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowActionModal(false)}>
          <View style={[styles.menuContent, { backgroundColor: colors.card }]}>
            <View style={styles.menuHandle} />
            <Text style={[styles.menuHeader, { color: colors.textMuted }]}>Message Options</Text>
            
            {activeMsg?.sender === 'me' && (!activeMsg.type || activeMsg.type === 'text') && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setEditingMsg(activeMsg); setInputText(activeMsg.text); setShowActionModal(false); }}>
                <Edit2 size={20} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>Edit Message</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => deleteMessage(activeMsg?._id!, 'me')}>
              <Trash2 size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Delete for me</Text>
            </TouchableOpacity>

            {activeMsg?.sender === 'me' && (
              <TouchableOpacity style={styles.menuItem} onPress={() => deleteMessage(activeMsg?._id!, 'everyone')}>
                <Trash2 size={20} color={palette.bloodRed} />
                <Text style={[styles.menuText, { color: palette.bloodRed }]}>Delete for everyone</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.menuItem, { borderTopWidth: 1, borderColor: colors.border, marginTop: 10 }]} onPress={() => setShowActionModal(false)}>
              <X size={20} color={colors.textMuted} />
              <Text style={[styles.menuText, { color: colors.textMuted }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 5, justifyContent: 'flex-end' },
  headerRow: { flexDirection: 'row', alignItems: 'center', height: 60 },
  iconPad: { padding: 10 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: palette.bloodRed },
  headerTitle: { color: 'white', fontSize: 17, fontWeight: '700' },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '500' },
  headerIcons: { flexDirection: 'row', gap: 2 },
  chatArea: { flex: 1, backgroundColor: '#E5DDD5' },
  chatScroll: { paddingHorizontal: 15, paddingTop: 50, paddingBottom: 30 },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  rowMe: { justifyContent: 'flex-end' },
  rowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, minWidth: 110, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1 },
  bubbleMe: { borderTopRightRadius: 0, borderBottomRightRadius: 12, marginLeft: 50 },
  bubbleThem: { borderTopLeftRadius: 0, borderBottomLeftRadius: 12, marginRight: 50 },
  msgText: { fontSize: 16, lineHeight: 22, fontWeight: '400' },
  msgImg: { width: 260, height: 200, borderRadius: 0 },
  editedText: { fontSize: 10, fontWeight: '500', fontStyle: 'italic' },
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, width: 180, paddingVertical: 4 },
  waveContainer: { flex: 1, height: 3, justifyContent: 'center' },
  wave: { position: 'absolute', width: '100%', height: 3, borderRadius: 2 },
  waveProgress: { position: 'absolute', left: 0, height: 3, borderRadius: 2 },
  audioTime: { fontSize: 12, fontWeight: '700', minWidth: 25, textAlign: 'right' },
  callBubble: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, paddingHorizontal: 4, minWidth: 180 },
  callIconCircle: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  callInfo: { flex: 1 },
  callTypeTitle: { fontSize: 16, fontWeight: '700' },
  callStatusSub: { fontSize: 13, color: 'rgba(0,0,0,0.5)', fontWeight: '600', marginTop: 1 },
  msgFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 5, marginTop: 4 },
  msgTime: { fontSize: 11, fontWeight: '600' },
  msgActions: { position: 'absolute', top: '50%', marginTop: -20, flexDirection: 'column', gap: 5, zIndex: 10 },
  actionsMe: { left: -45 },
  actionsThem: { right: -45 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowOpacity: 0.15, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  inputContainer: { backgroundColor: 'white', paddingBottom: 10, paddingTop: 5 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, gap: 8 },
  inputIconLeft: { padding: 6 },
  inputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, minHeight: 45 },
  recordBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, paddingVertical: 10, height: 60 },
  recordInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recordTime: { fontSize: 16, fontWeight: '700' },
  recordHint: { color: '#666', fontSize: 14, fontWeight: '500' },
  recordActions: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  recordCancel: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f0f0', justifyContent: 'center', alignItems: 'center' },
  recordSend: { width: 44, height: 44, borderRadius: 22, backgroundColor: palette.bloodRed, justifyContent: 'center', alignItems: 'center' },
  recordStop: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center' },
  sendBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  input: { flex: 1, maxHeight: 100, fontSize: 16, fontWeight: '400', paddingVertical: 0, marginRight: 8 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginVertical: 10 },
  // Menu Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  menuContent: { borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 40 },
  menuHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 15 },
  menuHeader: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 15, paddingVertical: 15 },
  menuText: { fontSize: 17, fontWeight: '500' },
  // Viewer
  viewerContainer: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  viewerHeader: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 },
  viewerClose: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 25 },
  viewerFull: { width: width, height: height * 0.8 },
});

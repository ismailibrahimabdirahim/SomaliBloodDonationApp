import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { MessageCircle, Search, ChevronRight, Trash2, X, Phone, Video } from 'lucide-react-native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../../services/api';
import { useTheme, palette } from '../../theme/colors';
import type { RootStackParamList } from '../../navigation/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useGlobalCall } from '../../context/CallContext';

type Conversation = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  lastMessage: string;
  time: string;
  unreadCount: number;
  avatar: string;
};

export default function ChatListScreen() {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterTab, setFilterTab] = useState<'All' | 'Unread'>('All');
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const { user } = useAuth();
  const { socket } = useGlobalCall();
  const fallbackTimerRef = useRef<any>(null);

  const handleConversationsData = useCallback((data: any[]) => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    const formatted = data.map((conv: any) => ({
      ...conv,
      time: new Date(conv.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
    setConversations(formatted);
    setLoading(false);
    setRefreshing(false);
  }, []);

  const fetchConversations = async () => {
    if (!user?.email) return;
    
    // Fetch fresh data immediately using Axios
    try {
      setLoading(true);
      const { data } = await api.get('/api/messages/conversations');
      handleConversationsData(data);
    } catch (err) {
      console.error('[ChatList] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }

    // Also tell the socket we want updates
    if (socket && socket.connected) {
      socket.emit('getConversations', user.email);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [user?.email, socket])
  );

  useEffect(() => {
    if (!socket) return;
    // Listen for new messages to update the list in real time
    const handleNewMessage = (msg: any) => {
      const myEmail = user?.email?.toLowerCase();
      const msgRec = msg.recipient?.toLowerCase();
      const msgSen = msg.sender?.toLowerCase();
      
      if (myEmail && (msgRec === myEmail || msgSen === myEmail)) {
        console.log('[ChatList] Real-time message match! Refreshing list...');
        fetchConversations();
      }
    };
    
    const handleUpdateOrDelete = () => {
      fetchConversations();
    };
    
    const handleRead = ({ reader, sender }: { reader: string, sender: string }) => {
      if (reader === user?.email) {
        setConversations(prev => prev.map(c => c.recipientEmail === sender ? { ...c, unreadCount: 0 } : c));
      }
    };
    
    socket.on('newMessage', handleNewMessage);
    socket.on('updateMessage', handleUpdateOrDelete);
    socket.on('deleteMessage', handleUpdateOrDelete);
    socket.on('messagesRead', handleRead);
    socket.on('conversationsData', handleConversationsData);
    
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('updateMessage', handleUpdateOrDelete);
      socket.off('deleteMessage', handleUpdateOrDelete);
      socket.off('messagesRead', handleRead);
      socket.off('conversationsData', handleConversationsData);
    };
  }, [user?.email, socket, handleConversationsData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const confirmDeleteChat = (item: Conversation) => {
    setSelectedConv(item);
  };

  const deleteConversation = async (email: string) => {
    try {
      // Optimistic update for speed
      setConversations(prev => prev.filter(c => c.recipientEmail !== email));
      await api.delete(`/api/messages/conversations/${encodeURIComponent(email)}`);
      await AsyncStorage.removeItem(`chat_cache_${email}`);
    } catch (error) {
      console.error('Error deleting conversation:', error);
      fetchConversations(); // Rollback on error
    }
  };

  const renderLastMessage = (message: string, isUnread: boolean) => {
    if (message.startsWith('[CALL_LOG]:')) {
      const isVideo = message.includes('Video');
      const isMissed = message.includes('Missed');
      const statusText = isMissed ? 'Missed call' : message.includes('ended') ? 'Call ended' : 'Call started';
      
      return (
        <View style={styles.callPreview}>
          {isVideo ? (
            <Video size={14} color={isMissed ? palette.bloodRed : (isDark ? '#8696A0' : '#54656F')} />
          ) : (
            <Phone size={14} color={isMissed ? palette.bloodRed : (isDark ? '#8696A0' : '#54656F')} />
          )}
          <Text 
            style={[
              styles.lastMessage, 
              { color: isMissed ? palette.bloodRed : (isUnread ? colors.text : colors.textMuted) },
              isUnread && styles.unreadMessage,
              { marginLeft: 4 }
            ]} 
            numberOfLines={1}
          >
            {statusText}
          </Text>
        </View>
      );
    }

    return (
      <Text 
        style={[
          styles.lastMessage, 
          { color: isUnread ? colors.text : colors.textMuted },
          isUnread && styles.unreadMessage
        ]} 
        numberOfLines={1}
      >
        {message}
      </Text>
    );
  };

  const renderItem = ({ item }: { item: Conversation }) => (
    <TouchableOpacity
      style={[styles.chatItem, { borderBottomColor: colors.border }]}
      onPress={() => {
        // Optimistically clear unread count for instant feedback
        setConversations(prev => prev.map(c => c.id === item.id ? { ...c, unreadCount: 0 } : c));
        navigation.navigate('Chat', { 
          recipientName: item.recipientName, 
          recipientEmail: item.recipientEmail 
        });
      }}
      onLongPress={() => confirmDeleteChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        {item.unreadCount > 0 && (
          <View style={[styles.unreadBadge, { backgroundColor: palette.bloodRed }]}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.recipientName}
          </Text>
          <Text style={[styles.time, { color: colors.textMuted }]}>
            {item.time}
          </Text>
        </View>
        
        <View style={styles.chatFooter}>
          {renderLastMessage(item.lastMessage, item.unreadCount > 0)}
          <ChevronRight size={16} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredConversations = conversations.filter(c => filterTab === 'All' ? true : c.unreadCount > 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: colors.card }]}>
          <Search size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterPill, filterTab === 'All' && styles.filterPillActive, { backgroundColor: filterTab === 'All' ? (isDark ? '#3A4045' : '#E8F0F3') : (isDark ? '#1C2126' : '#F4F7F9') }]} 
          onPress={() => setFilterTab('All')}
        >
          <Text style={[styles.filterText, filterTab === 'All' ? [styles.filterTextActive, { color: isDark ? '#FFFFFF' : '#0B141B' }] : { color: isDark ? '#8696A0' : '#54656F' }]}>All</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterPill, filterTab === 'Unread' && styles.filterPillActive, { backgroundColor: filterTab === 'Unread' ? (isDark ? '#3A4045' : '#E8F0F3') : (isDark ? '#1C2126' : '#F4F7F9') }]} 
          onPress={() => setFilterTab('Unread')}
        >
          <Text style={[styles.filterText, filterTab === 'Unread' ? [styles.filterTextActive, { color: isDark ? '#FFFFFF' : '#0B141B' }] : { color: isDark ? '#8696A0' : '#54656F' }]}>Unread</Text>
        </TouchableOpacity>
      </View>

      {loading && conversations.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={palette.bloodRed} />
        </View>
      ) : filteredConversations.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <MessageCircle size={48} color={colors.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No messages yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
            When you start chatting with donors or recipients, they will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredConversations}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.bloodRed} />
          }
        />
      )}

      {/* Slide-up Action Menu */}
      <Modal
        visible={!!selectedConv}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedConv(null)}
      >
        <Pressable 
          style={styles.modalOverlay} 
          onPress={() => setSelectedConv(null)}
        >
          <View style={[styles.menuSheet, { backgroundColor: colors.card }]}>
            <View style={styles.menuHeader}>
              <View style={styles.menuDragHandle} />
              <Text style={[styles.menuTitle, { color: colors.text }]}>Chat Options</Text>
            </View>

            <TouchableOpacity 
              style={styles.menuItem}
              onPress={() => {
                if (selectedConv) {
                  const email = selectedConv.recipientEmail;
                  setSelectedConv(null);
                  deleteConversation(email);
                }
              }}
            >
              <View style={[styles.menuIconBox, { backgroundColor: '#FFEBEE' }]}>
                <Trash2 size={22} color={palette.bloodRed} />
              </View>
              <Text style={[styles.menuItemText, { color: palette.bloodRed }]}>Delete Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.cancelBtn, { backgroundColor: isDark ? '#333' : '#F5F5F5' }]}
              onPress={() => setSelectedConv(null)}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  searchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterPillActive: {
    // Active specific styles if needed
  },
  filterText: {
    fontSize: 15,
    fontWeight: '600',
  },
  filterTextActive: {
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 100,
  },
  chatItem: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#eee',
  },
  unreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 5,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 10,
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  unreadMessage: {
    fontWeight: '700',
  },
  callPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 10,
  },
  emptyDesc: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Menu Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  menuSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  menuHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  menuDragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDD',
    marginBottom: 10,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  menuIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelBtn: {
    marginTop: 10,
    paddingVertical: 15,
    borderRadius: 15,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});

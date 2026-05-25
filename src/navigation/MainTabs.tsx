import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Home, Droplets, PlusCircle, User, MessageCircle } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import DashboardScreen from '../screens/main/DashboardScreen';
import RequestsScreen from '../screens/requests/RequestsScreen';
import CreateRequestScreen from '../screens/requests/CreateRequestScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { useTheme, palette } from '../theme/colors';
import { useLanguage } from '../context/LanguageContext';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  
  const mapRouteToIcon: Record<string, typeof Home> = {
    Home: Home,
    Requests: Droplets,
    PostRequest: PlusCircle,
    Chats: MessageCircle,
    Profile: User,
  };
  const mapRouteToLabel: Record<string, string> = {
    Home: t('home'),
    Requests: t('requests'),
    PostRequest: t('post_request'),
    Chats: t('chats') || 'Chats',
    Profile: t('profile'),
  };

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <View style={[styles.bar, { backgroundColor: colors.card }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = mapRouteToIcon[route.name] ?? Home;
          const label = mapRouteToLabel[route.name] ?? route.name;
          const onPress = () => {
            const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <TouchableOpacity key={route.key} accessibilityRole="button" onPress={onPress} style={styles.item}>
              <View style={[styles.iconWrap, focused && styles.iconWrapActive, focused && { backgroundColor: isDark ? 'rgba(211, 47, 47, 0.15)' : palette.red50 }]}>
                <Icon size={24} color={focused ? palette.bloodRed : colors.textMuted} strokeWidth={focused ? 2.5 : 2} />
              </View>
              <Text style={[styles.label, { color: colors.textMuted }, focused && { color: palette.bloodRed }]}>{label.toUpperCase()}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(p) => <TabBar {...p} />}
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={DashboardScreen} />
      <Tab.Screen name="Requests" component={RequestsScreen} />
      <Tab.Screen name="PostRequest" component={CreateRequestScreen} />
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 28,
    borderTopWidth: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 12,
  },
  item: { alignItems: 'center', flex: 1 },
  iconWrap: { padding: 8, borderRadius: 16 },
  iconWrapActive: {},
  label: {
    marginTop: 4,
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

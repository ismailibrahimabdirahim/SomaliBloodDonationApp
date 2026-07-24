import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ShieldCheck, Droplets, Users, Package, History, User } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminRequestsScreen from '../screens/admin/AdminRequestsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminInventoryScreen from '../screens/admin/AdminInventoryScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import { useTheme, palette } from '../theme/colors';
import type { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

function TabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  
  const mapRouteToIcon: Record<string, typeof ShieldCheck> = {
    AdminDashboard: ShieldCheck,
    AdminRequests: Droplets,
    AdminUsers: Users,
    AdminInventory: Package,
    AdminProfile: User,
  };
  const mapRouteToLabel: Record<string, string> = {
    AdminDashboard: 'Dashboard',
    AdminRequests: 'Requests',
    AdminUsers: 'Users',
    AdminInventory: 'Inventory',
    AdminProfile: 'Profile',
  };

  return (
    <View style={{ backgroundColor: 'transparent' }}>
      <View style={[styles.bar, { backgroundColor: colors.card }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const Icon = mapRouteToIcon[route.name] ?? ShieldCheck;
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

export default function AdminTabs() {
  return (
    <Tab.Navigator
      tabBar={(p) => <TabBar {...p} />}
      screenOptions={{ 
        headerShown: false,
      }}
    >
      <Tab.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Tab.Screen name="AdminRequests" component={AdminRequestsScreen} />
      <Tab.Screen name="AdminUsers" component={AdminUsersScreen} />
      <Tab.Screen name="AdminInventory" component={AdminInventoryScreen} />
      <Tab.Screen name="AdminProfile" component={AdminProfileScreen} />
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

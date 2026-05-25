import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { rootNavigationRef } from './navigationRef';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import MainTabs from './MainTabs';
import ChatScreen from '../screens/chat/ChatScreen';
import DonateActionScreen from '../screens/requests/DonateActionScreen';
import RequestDetailScreen from '../screens/requests/RequestDetailScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import PublicProfileScreen from '../screens/main/PublicProfileScreen';
import Sidebar from '../components/Sidebar';
import LoadingScreen from '../screens/main/LoadingScreen';
import CallScreen from '../screens/chat/CallScreen';
import { AppUIProvider } from '../context/AppUIContext';
import { CallProvider } from '../context/CallContext';
import { useAuth } from '../context/AuthContext';
import { useTheme, palette } from '../theme/colors';
import { useThemeContext } from '../context/ThemeContext';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const { colors, isDark } = useTheme();
  const { toggleTheme } = useThemeContext();
  const { isAuthenticated, isLoaded, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Custom theme to handle the "white bleeding" issue
  const baseTheme = isDark ? DarkTheme : DefaultTheme;
  const NavigationTheme = {
    ...baseTheme,
    dark: isDark,
    colors: {
      ...baseTheme.colors,
      primary: palette.bloodRed,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: 'transparent',
      notification: palette.bloodRed,
    },
  };

  const navigateSidebar = (screen: string) => {
    if (!rootNavigationRef.isReady()) return;
    if (screen === 'Settings') rootNavigationRef.navigate('Settings');
    else if (screen === 'Notifications') rootNavigationRef.navigate('Notifications');
    else if (screen === 'ProfileTab') rootNavigationRef.navigate('MainTabs', { screen: 'Profile' });
    else if (screen === 'RequestsTab') rootNavigationRef.navigate('MainTabs', { screen: 'Requests' });
    else rootNavigationRef.navigate('MainTabs', { screen: 'Home' });
  };

  if (!isLoaded) {
    return <LoadingScreen message="Loading SomaliBD..." />;
  }

  return (
    <CallProvider>
      <AppUIProvider openSidebar={() => setSidebarOpen(true)}>
        <NavigationContainer ref={rootNavigationRef} theme={NavigationTheme}>
          <Stack.Navigator
            key={isAuthenticated ? 'app' : 'auth'}
            initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
            screenOptions={{ headerShown: false }}
          >
            {!isAuthenticated ? (
              <>
                <Stack.Screen name="Welcome">
                  {({ navigation }) => (
                    <WelcomeScreen onGetStarted={() => navigation.navigate('Onboarding')} />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Onboarding">
                  {({ navigation }) => (
                    <OnboardingScreen onComplete={() => navigation.navigate('Login', { initialIsRegister: false })} />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Login">
                  {({ navigation }) => (
                    <LoginScreen
                      onSignUp={() => navigation.navigate('Register')}
                      onBack={() => navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
                <Stack.Screen name="Register">
                  {({ navigation }) => (
                    <RegisterScreen 
                      onSignIn={() => navigation.navigate('Login')} 
                      onBack={() => navigation.goBack()}
                    />
                  )}
                </Stack.Screen>
              </>
            ) : (
              <>
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="Chat" component={ChatScreen} />
                <Stack.Screen name="DonateAction" component={DonateActionScreen} />
                <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
                <Stack.Screen name="Notifications" component={NotificationsScreen} />
                <Stack.Screen name="Settings" component={SettingsScreen} />
                <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
                <Stack.Screen name="Call" component={CallScreen} options={{ animation: 'slide_from_bottom' }} />
              </>
            )}
          </Stack.Navigator>
  
          {isAuthenticated ? (
            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              setScreen={navigateSidebar}
              onLogout={async () => {
                setSidebarOpen(false);
                await logout();
              }}
            />
          ) : null}
  
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </NavigationContainer>
      </AppUIProvider>
    </CallProvider>
  );
}

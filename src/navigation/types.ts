export type MainTabParamList = {
  Home: undefined;
  Requests: undefined;
  PostRequest: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: { initialIsRegister?: boolean } | undefined;
  Register: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  Chat: { recipientName: string; recipientEmail: string };
  DonateAction: { requestData: Record<string, unknown> };
  RequestDetail: { requestData: Record<string, unknown> };
  Settings: undefined;
  Notifications: undefined;
  PublicProfile: { email: string; name?: string };
  Call: { 
    type: 'audio' | 'video'; 
    mode: 'outgoing' | 'incoming'; 
    otherUserEmail: string; 
    otherUserName: string; 
    channel: string;
    incomingCallData?: any;
  };
};

export type MainTabParamList = {
  Home: undefined;
  Requests: undefined;
  PostRequest: undefined;
  Donate: undefined;
  Chats: undefined;
  Profile: undefined;
};

export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminRequests: undefined;
  AdminUsers: undefined;
  AdminInventory: undefined;
  AdminProfile: undefined;
};

export type RootStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  Login: { initialIsRegister?: boolean } | undefined;
  Register: undefined;
  MainTabs: { screen?: keyof MainTabParamList } | undefined;
  AdminTabs: { screen?: keyof AdminTabParamList } | undefined;
  Chat: { recipientName: string; recipientEmail: string };
  DonateAction: { requestData: Record<string, unknown> };
  VoluntaryDonate: undefined;
  RequestDetail: { requestData: Record<string, unknown> };
  Settings: undefined;
  AdminDashboard: undefined;
  AdminActivity: undefined;
  Notifications: undefined;
  PublicProfile: { email: string; name?: string };
  AvailableBlood: undefined;
  Call: { 
    type: 'audio' | 'video'; 
    mode: 'outgoing' | 'incoming'; 
    otherUserEmail: string; 
    otherUserName: string; 
    channel: string;
    incomingCallData?: any;
  };
};

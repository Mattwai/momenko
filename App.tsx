import './polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/theme/theme';
import LoginScreen from './src/screens/auth/LoginScreen';
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import ChatbotScreen from './src/screens/chatbot/ChatbotScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CognitiveAssessmentScreen from './src/screens/chatbot/CognitiveAssessmentScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import FamilyDashboardScreen from './src/screens/dashboard/FamilyDashboardScreen';
import MemoriesScreen from './src/screens/profile/MemoriesScreen';
import ChatbotCallScreen from './src/screens/chatbot/ChatbotCallScreen';
import PersonalInformationScreen from './src/screens/profile/PersonalInformationScreen';
import EmergencyContactsScreen from './src/screens/profile/EmergencyContactsScreen';
import FamilyContactsScreen from './src/screens/profile/FamilyContactsScreen';
import { ChatProvider } from './src/contexts/ChatContext';

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Chatbot: undefined;
  ChatbotCall: undefined;
  Register: undefined;
  Profile: undefined;
  Main: { screen?: string } | undefined;
  CognitiveAssessment: undefined;
  Settings: undefined;
  Family: undefined;
  Memories: undefined;
  PersonalInformation: undefined;
  EmergencyContacts: undefined;
  FamilyContacts: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="CognitiveAssessment" component={CognitiveAssessmentScreen} />
      <ProfileStack.Screen name="Memories" component={MemoriesScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="Family" component={FamilyDashboardScreen} />
      <ProfileStack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
      <ProfileStack.Screen name="EmergencyContacts" component={EmergencyContactsScreen} />
      <ProfileStack.Screen name="FamilyContacts" component={FamilyContactsScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'view-dashboard' : 'view-dashboard-outline';
          } else if (route.name === 'Chatbot') {
            iconName = focused ? 'chat' : 'chat-outline';
          } else if (route.name === 'ProfileStack') {
            iconName = focused ? 'account-circle' : 'account-circle-outline';
          }

          return <Icon name={iconName as string} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: 'gray',
        tabBarLabelStyle: { fontSize: 16, marginBottom: 8 },
        tabBarStyle: { 
          height: 80,
          paddingBottom: 20,
          borderTopWidth: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 4,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen} 
        options={{
          tabBarLabel: 'Home'
        }}
      />
      <Tab.Screen 
        name="Chatbot" 
        component={ChatbotScreen} 
        options={{
          tabBarLabel: 'Chatbot'
        }}
      />
      <Tab.Screen 
        name="ProfileStack" 
        component={ProfileStackScreen} 
        options={{
          tabBarLabel: 'Profile'
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ChatProvider>
          <NavigationContainer>
            <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="Main" component={MainTabNavigator} />
              <Stack.Screen name="ChatbotCall" component={ChatbotCallScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </ChatProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
} 
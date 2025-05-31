import './polyfills';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/theme/theme';
import LoginScreen from './src/screens/auth/LoginScreen';
import ChatbotScreen from './src/screens/chatbot/ChatbotScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ProfileScreen from './src/screens/profile/ProfileScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SettingsScreen from './src/screens/profile/SettingsScreen';
import MemoriesScreen from './src/screens/profile/MemoriesScreen';
import ChatbotCallScreen from './src/screens/chatbot/ChatbotCallScreen';
import PersonalInformationScreen from './src/screens/profile/PersonalInformationScreen';
import { SupabaseProvider } from './src/contexts/SupabaseContext';

export type RootStackParamList = {
  Login: undefined;
  Chatbot: undefined;
  ChatbotCall: undefined;
  Register: undefined;
  Profile: undefined;
  Main: { screen?: string } | undefined;
  Settings: undefined;
  Memories: undefined;
  PersonalInformation: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();
const ProfileStack = createStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Memories" component={MemoriesScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text,
        tabBarStyle: { backgroundColor: theme.colors.surface, height: 96 },
        tabBarLabelStyle: { fontSize: 14, fontWeight: 'bold', paddingBottom: 8 },
        tabBarItemStyle: { paddingVertical: 8 },
        tabBarIcon: ({ color, focused }) => {
          let iconName = '';
          if (route.name === 'Chatbot') iconName = 'robot-outline';
          else if (route.name === 'ProfileTab') iconName = 'account-circle-outline';
          return <Icon name={iconName} color={color} size={focused ? 30 : 25} />;
        },
      })}
    >
      <Tab.Screen name="Chatbot" component={ChatbotScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileStackScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
}

const App = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SupabaseProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Login"
              screenOptions={{
                headerStyle: {
                  backgroundColor: theme.colors.primary,
                },
                headerTintColor: '#FFFFFF',
                headerTitleStyle: {
                  fontWeight: 'bold',
                },
                cardStyle: { backgroundColor: theme.colors.background },
                cardStyleInterpolator: ({ current: { progress } }) => ({
                  cardStyle: {
                    opacity: progress,
                  },
                }),
              }}
            >
              <Stack.Screen 
                name="Login" 
                component={LoginScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen 
                name="Register" 
                component={RegisterScreen}
                options={{
                  headerShown: false,
                }}
              />
              <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
              <Stack.Screen name="ChatbotCall" component={ChatbotCallScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </SupabaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App; 
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

export type RootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  Chatbot: undefined;
  Register: undefined;
  Profile: undefined;
  Main: { screen?: string } | undefined;
  CognitiveAssessment: undefined;
  Settings: undefined;
  Family: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator();

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
          if (route.name === 'Dashboard') iconName = 'view-dashboard-outline';
          else if (route.name === 'Chatbot') iconName = 'robot-outline';
          else if (route.name === 'Profile') iconName = 'account-circle-outline';
          return <Icon name={iconName} color={color} size={focused ? 30 : 25} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Chatbot" component={ChatbotScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const App = () => {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
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
            <Stack.Screen name="CognitiveAssessment" component={CognitiveAssessmentScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="Family" component={FamilyDashboardScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App; 
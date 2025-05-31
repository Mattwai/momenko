import './polyfills';
import React from 'react';
import { View } from 'react-native';
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
import VoiceDebugScreen from './src/screens/debug/VoiceDebugScreen';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import { CulturalProvider } from './src/contexts/CulturalContext';
import { initializeApp, InitializationResult } from './src/utils/appInitialization';
import { ActivityIndicator, Text, Button } from 'react-native-paper';

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
  VoiceDebug: undefined;
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
  const [isInitializing, setIsInitializing] = React.useState(true);
  const [initializationError, setInitializationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const initialize = async () => {
      try {
        const result: InitializationResult = await initializeApp({
          showAlerts: false, // We'll handle errors in UI
          logDetails: true,
        });

        if (!result.success && result.errors.length > 0) {
          // Only set error for critical failures
          const criticalErrors = result.errors.filter(error => 
            error.includes('Azure') || error.includes('Configuration')
          );
          if (criticalErrors.length > 0) {
            setInitializationError(criticalErrors[0]);
          }
        }
      } catch (error) {
        console.error('App initialization failed:', error);
        setInitializationError(`Initialization failed: ${error}`);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  if (isInitializing) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
            <ActivityIndicator size="large" animating={true} color={theme.colors.primary} />
            <Text style={{ marginTop: 16, fontSize: 18, color: theme.colors.onBackground }}>
              Initializing Momenko...
            </Text>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  if (initializationError) {
    return (
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: theme.colors.background }}>
            <Icon name="alert-circle" size={64} color={theme.colors.error} />
            <Text style={{ marginTop: 16, fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: theme.colors.error }}>
              Initialization Failed
            </Text>
            <Text style={{ marginTop: 8, fontSize: 16, textAlign: 'center', color: theme.colors.onBackground }}>
              {initializationError}
            </Text>
            <Button 
              mode="contained" 
              onPress={async () => {
                setIsInitializing(true);
                setInitializationError(null);
                // Restart initialization
                try {
                  const result = await initializeApp({ showAlerts: false, logDetails: true });
                  if (!result.success && result.errors.length > 0) {
                    const criticalErrors = result.errors.filter(error => 
                      error.includes('Azure') || error.includes('Configuration')
                    );
                    if (criticalErrors.length > 0) {
                      setInitializationError(criticalErrors[0]);
                    }
                  }
                } catch (error) {
                  setInitializationError(`Initialization failed: ${error}`);
                } finally {
                  setIsInitializing(false);
                }
              }}
              style={{ marginTop: 24 }}
            >
              Retry
            </Button>
          </View>
        </PaperProvider>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <SupabaseProvider>
          <CulturalProvider>
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
                <Stack.Screen name="VoiceDebug" component={VoiceDebugScreen} options={{ title: 'Voice Debug' }} />
              </Stack.Navigator>
            </NavigationContainer>
          </CulturalProvider>
        </SupabaseProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
};

export default App; 
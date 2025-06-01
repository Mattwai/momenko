import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import SettingsPreferences from '../../components/ui/SettingsPreferences';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import config from '../../config';

type SettingsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

interface Props {
  navigation: SettingsScreenNavigationProp;
}

const SettingsScreen: React.FC<Props> = ({ navigation }) => {
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large' | 'extra-large'>('large');

  const handleSettingsChange = (settings: any) => {
    console.log('Settings changed:', settings);
    // TODO: Persist settings to storage
    if (settings.isHighContrast !== undefined) {
      setIsHighContrast(settings.isHighContrast);
    }
    if (settings.textSize !== undefined) {
      setTextSize(settings.textSize);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
      <View style={styles.backArrowContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Back to Profile"
          accessibilityRole="button"
        >
          <Icon name="arrow-left" size={32} color="#6366F1" />
        </TouchableOpacity>
      </View>
      
      <View style={styles.header}>
        <Text style={[styles.title, { fontSize: textSize === 'extra-large' ? 32 : 28 }]}>
          Settings & Preferences
        </Text>
      </View>

      <SettingsPreferences
        isHighContrast={isHighContrast}
        textSize={textSize}
        onSettingsChange={handleSettingsChange}
      />
      
      {config.app.isDevelopment && (
        <View style={styles.debugSection}>
          <Card style={styles.debugCard}>
            <Card.Title
              title="Developer Tools"
              left={(props) => <Icon {...props} name="code-braces" />}
              titleStyle={{ fontSize: textSize === 'extra-large' ? 20 : 16 }}
            />
            <Card.Content>
              <Button
                mode="outlined"
                onPress={() => navigation.navigate('VoiceDebug')}
                icon="microphone-variant"
                style={styles.debugButton}
                labelStyle={{ fontSize: textSize === 'extra-large' ? 18 : 14 }}
              >
                Voice Recording Debug
              </Button>
            </Card.Content>
          </Card>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontWeight: 'bold',
    color: '#6366F1',
    marginTop: 8,
    textAlign: 'center',
  },
  backArrowContainer: {
    width: '100%',
    alignItems: 'flex-start',
    marginTop: 8,
    marginLeft: 8,
    marginBottom: 0,
    zIndex: 10,
  },
  backButton: {
    backgroundColor: 'transparent',
    padding: 4,
  },
  debugSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  debugCard: {
    elevation: 2,
  },
  debugButton: {
    marginTop: 8,
  },
});

export default SettingsScreen;
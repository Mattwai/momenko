import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, Button, List } from 'react-native-paper';
import { getCurrentUserId, signOut } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchUserProfile } from '../../services/supabase/profile';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const uid = await getCurrentUserId();
      if (uid) {
        const { data } = await fetchUserProfile(uid);
        if (data) {
          setFullName(data.full_name || '');
          setPhoneNumber(data.phone_number || '');
        }
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const menuItems = [
    {
      title: 'AI Memories',
      icon: 'brain',
      onPress: () => navigation.navigate('Memories'),
    },
    {
      title: 'Personal Information',
      icon: 'account',
      onPress: () => navigation.navigate('PersonalInformation'),
    },
    {
      title: 'Settings',
      icon: 'cog',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      onPress: () => {},
    },
  ];

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#F3F4F6'}} edges={["top","left","right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="fadeInDown" duration={1000}>
          <View style={styles.profileCard}>
            <Avatar.Image
              size={120}
              source={{ uri: 'https://via.placeholder.com/120' }}
              style={styles.avatar}
            />
            <Text variant="headlineLarge" style={styles.greeting}>
              Welcome, {fullName || 'Friend'}
            </Text>
            <Text variant="titleMedium" style={styles.phoneLabel}>
              Phone
            </Text>
            <Text variant="titleLarge" style={styles.phoneNumber}>
              {phoneNumber || 'Not set'}
            </Text>
          </View>
        </Animatable.View>

        <View style={styles.section}>
          <Text variant="titleLarge" style={styles.sectionHeader}>Your Menu</Text>
          {menuItems.map((item, index) => (
            <Animatable.View
              key={item.title}
              animation="fadeInUp"
              delay={index * 200}
            >
              <List.Item
                title={<Text style={styles.menuText}>{item.title}</Text>}
                left={props => <List.Icon {...props} icon={item.icon} color="#6366F1" />}
                right={props => <List.Icon {...props} icon="chevron-right" color="#6366F1" />}
                onPress={item.onPress}
                style={styles.listItem}
              />
            </Animatable.View>
          ))}
        </View>

        <View style={styles.section}>
          <Button
            mode="outlined"
            icon="logout"
            onPress={handleLogout}
            style={styles.logoutButton}
            labelStyle={{ fontSize: 20 }}
            accessibilityLabel="Log Out"
          >
            Log Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  profileCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 24,
    marginTop: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  greeting: {
    marginTop: 16,
    fontWeight: 'bold',
    color: '#6366F1',
    fontSize: 28,
    textAlign: 'center',
  },
  phoneLabel: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 18,
  },
  phoneNumber: {
    fontSize: 22,
    color: '#1F2937',
    marginBottom: 5,
  },
  settingsButton: {
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: '#8B5CF6',
    width: 180,
    alignSelf: 'center',
  },
  section: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  sectionHeader: {
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 12,
    fontSize: 22,
  },
  menuText: {
    fontSize: 20,
    color: '#1F2937',
  },
  avatar: {
    marginBottom: 16,
  },
  listItem: {
    backgroundColor: 'white',
    marginBottom: 12,
    borderRadius: 12,
    minHeight: 64,
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButton: {
    marginTop: 24,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#EF4444',
    width: '100%',
    alignSelf: 'center',
    paddingVertical: 12,
  },
});

export default ProfileScreen; 
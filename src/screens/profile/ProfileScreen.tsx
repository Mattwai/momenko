import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, Button, List, useTheme } from 'react-native-paper';
import { fetchUserProfile, updateUserProfile } from '../../services/supabase/profile';
import { getCurrentUserId, signOut, deleteAccount } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import * as Animatable from 'react-native-animatable';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteMsg, setDeleteMsg] = useState('');
  const theme = useTheme();

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      const uid = await getCurrentUserId();
      setUserId(uid);
      if (uid) {
        const { data, error } = await fetchUserProfile(uid);
        if (data) {
          setFullName(data.full_name || '');
          setPhoneNumber(data.phone_number || '');
        }
        if (error) setError('Failed to load profile');
      } else {
        setError('User not authenticated');
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    setError('');
    setSuccess('');
    const { error } = await updateUserProfile(userId, { full_name: fullName, phone_number: phoneNumber });
    if (error) {
      setError('Failed to update profile');
    } else {
      setSuccess('Profile updated successfully!');
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const handleDeleteAccount = async () => {
    setDeleteMsg('');
    const { error } = await deleteAccount();
    if (error) {
      setDeleteMsg(error.message);
    } else {
      setDeleteMsg('Account deleted.');
    }
  };

  const menuItems = [
    {
      title: 'Personal Information',
      icon: 'account',
      onPress: () => {},
    },
    {
      title: 'Settings',
      icon: 'cog',
      onPress: () => {},
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
    <ScrollView style={styles.container}>
      <Animatable.View animation="fadeInDown" duration={1000}>
        <View style={styles.header}>
          <Avatar.Image
            size={100}
            source={{ uri: 'https://via.placeholder.com/100' }}
            style={styles.avatar}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {fullName}
          </Text>
          <Text variant="bodyLarge" style={styles.email}>
            {phoneNumber}
          </Text>
        </View>
      </Animatable.View>

      <View style={styles.content}>
        {menuItems.map((item, index) => (
          <Animatable.View
            key={item.title}
            animation="fadeInUp"
            delay={index * 200}
          >
            <List.Item
              title={item.title}
              left={props => <List.Icon {...props} icon={item.icon} />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={item.onPress}
              style={styles.listItem}
            />
          </Animatable.View>
        ))}

        <Animatable.View animation="fadeInUp" delay={600}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Log Out
          </Button>
        </Animatable.View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
  },
  avatar: {
    marginBottom: 16,
  },
  name: {
    marginBottom: 4,
  },
  email: {
    opacity: 0.7,
  },
  content: {
    padding: 16,
  },
  listItem: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 8,
  },
  logoutButton: {
    marginTop: 24,
  },
});

export default ProfileScreen; 
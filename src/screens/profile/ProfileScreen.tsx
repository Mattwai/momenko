import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, Button, List } from 'react-native-paper';
import { fetchUserProfile } from '../../services/supabase/profile';
import { getCurrentUserId, signOut } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import * as Animatable from 'react-native-animatable';

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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
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
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginTop: 32,
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
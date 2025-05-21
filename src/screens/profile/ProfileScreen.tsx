import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { fetchUserProfile, updateUserProfile } from '../../services/supabase/profile';
import { getCurrentUserId } from '../../services/supabase/auth';

const ProfileScreen: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  if (loading) {
    return <Text>Loading...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Profile</Text>
      <TextInput
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        style={styles.input}
      />
      <TextInput
        label="Phone Number"
        value={phoneNumber}
        onChangeText={setPhoneNumber}
        style={styles.input}
        keyboardType="phone-pad"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      <Button mode="contained" onPress={handleSave} loading={saving} disabled={saving}>
        Save
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
  success: {
    color: 'green',
    marginBottom: 12,
  },
});

export default ProfileScreen; 
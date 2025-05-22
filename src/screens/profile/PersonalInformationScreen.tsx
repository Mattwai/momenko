import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, TextInput, Dialog, Portal, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchUserProfile, updateUserProfile } from '../../services/supabase/profile';
import { getCurrentUserId } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';

type PersonalInformationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PersonalInformation'>;

type Props = {
  navigation: PersonalInformationScreenNavigationProp;
};

const PersonalInformationScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [editNameVisible, setEditNameVisible] = useState(false);
  const [editPhoneVisible, setEditPhoneVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [errorName, setErrorName] = useState('');
  const [errorPhone, setErrorPhone] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const uid = await getCurrentUserId();
      if (uid) {
        const { data } = await fetchUserProfile(uid);
        if (data) {
          setFullName(data.full_name || '');
          setPhoneNumber(data.phone_number || '');
        }
      }
    };
    loadProfile();
  }, []);

  const handleOpenEditName = () => {
    setNewName(fullName);
    setEditNameVisible(true);
    setErrorName('');
  };
  const handleCloseEditName = () => {
    setEditNameVisible(false);
    setErrorName('');
  };
  const handleSaveName = async () => {
    if (!newName.trim()) {
      setErrorName('Name cannot be empty');
      return;
    }
    setSavingName(true);
    setErrorName('');
    const uid = await getCurrentUserId();
    if (uid) {
      const { error } = await updateUserProfile(uid, { full_name: newName.trim() });
      if (!error) {
        setFullName(newName.trim());
        setEditNameVisible(false);
      } else {
        setErrorName('Failed to update name. Please try again.');
      }
    }
    setSavingName(false);
  };

  const handleOpenEditPhone = () => {
    setNewPhone(phoneNumber);
    setEditPhoneVisible(true);
    setErrorPhone('');
  };
  const handleCloseEditPhone = () => {
    setEditPhoneVisible(false);
    setErrorPhone('');
  };
  const handleSavePhone = async () => {
    if (!newPhone.trim()) {
      setErrorPhone('Phone number cannot be empty');
      return;
    }
    setSavingPhone(true);
    setErrorPhone('');
    const uid = await getCurrentUserId();
    if (uid) {
      const { error } = await updateUserProfile(uid, { phone_number: newPhone.trim() });
      if (!error) {
        setPhoneNumber(newPhone.trim());
        setEditPhoneVisible(false);
      } else {
        setErrorPhone('Failed to update phone number. Please try again.');
      }
    }
    setSavingPhone(false);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
      <View style={styles.centeredContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Personal Information</Text>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Full Name</Text>
            <Text style={styles.value}>{fullName || 'Not set'}</Text>
            <Button
              mode="contained"
              onPress={handleOpenEditName}
              style={styles.editButton}
              labelStyle={styles.editButtonLabel}
              accessibilityLabel="Edit Name"
            >
              Edit Name
            </Button>
          </View>
          <Divider style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.label}>Phone Number</Text>
            <Text style={styles.value}>{phoneNumber || 'Not set'}</Text>
            <Button
              mode="contained"
              onPress={handleOpenEditPhone}
              style={styles.editButton}
              labelStyle={styles.editButtonLabel}
              accessibilityLabel="Edit Phone Number"
            >
              Edit Phone Number
            </Button>
          </View>
        </View>
      </View>
      <Portal>
        <Dialog visible={editNameVisible} onDismiss={handleCloseEditName}>
          <Dialog.Title style={{ fontSize: 28, color: '#6366F1', textAlign: 'center' }}>Edit Name</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Full Name"
              value={newName}
              onChangeText={setNewName}
              style={{ fontSize: 22, backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 8 }}
              accessibilityLabel="Full Name Input"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
              error={!!errorName}
            />
            {!!errorName && <Text style={{ color: '#EF4444', fontSize: 18, marginTop: 4 }}>{errorName}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCloseEditName} labelStyle={{ fontSize: 20 }}>Cancel</Button>
            <Button onPress={handleSaveName} loading={savingName} disabled={savingName} labelStyle={{ fontSize: 20 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
        
        <Dialog visible={editPhoneVisible} onDismiss={handleCloseEditPhone}>
          <Dialog.Title style={{ fontSize: 28, color: '#6366F1', textAlign: 'center' }}>Edit Phone Number</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Phone Number"
              value={newPhone}
              onChangeText={setNewPhone}
              style={{ fontSize: 22, backgroundColor: '#F3F4F6', borderRadius: 12, marginBottom: 8 }}
              accessibilityLabel="Phone Number Input"
              autoFocus
              returnKeyType="done"
              keyboardType="phone-pad"
              onSubmitEditing={handleSavePhone}
              error={!!errorPhone}
            />
            {!!errorPhone && <Text style={{ color: '#EF4444', fontSize: 18, marginTop: 4 }}>{errorPhone}</Text>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCloseEditPhone} labelStyle={{ fontSize: 20 }}>Cancel</Button>
            <Button onPress={handleSavePhone} loading={savingPhone} disabled={savingPhone} labelStyle={{ fontSize: 20 }}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  card: {
    width: '92%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 28,
    paddingVertical: 36,
    paddingHorizontal: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 18,
    textAlign: 'center',
    marginTop: 0,
  },
  divider: {
    width: '100%',
    marginVertical: 18,
    backgroundColor: '#E5E7EB',
    height: 1.5,
  },
  infoRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 22,
    color: '#6366F1',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  value: {
    fontSize: 26,
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#6366F1',
    borderRadius: 16,
    marginVertical: 8,
    width: '80%',
    alignSelf: 'center',
    paddingVertical: 10,
    elevation: 0,
  },
  editButtonLabel: {
    fontSize: 20,
    color: 'white',
    fontWeight: 'bold',
  },
});

export default PersonalInformationScreen; 
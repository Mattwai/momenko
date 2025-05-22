import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { Text, Button, TextInput, Dialog, Portal, Divider, FAB, Surface, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchEmergencyContacts, addEmergencyContact, deleteEmergencyContact } from '../../services/supabase/emergencyContacts';
import { getCurrentUserId } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type EmergencyContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EmergencyContacts'>;

type Props = {
  navigation: EmergencyContactsScreenNavigationProp;
};

interface EmergencyContact {
  id: string;
  name: string;
  role?: string;
  contact_info: string;
  notes?: string;
  created_at: string;
}

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;

const EmergencyContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newContactInfo, setNewContactInfo] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    setLoading(true);
    const uid = await getCurrentUserId();
    if (uid) {
      const { data, error } = await fetchEmergencyContacts(uid);
      if (!error && data) {
        setContacts(data);
      }
    }
    setLoading(false);
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newContactInfo.trim()) {
      setError('Name and contact information are required');
      return;
    }

    setSaving(true);
    setError('');
    const uid = await getCurrentUserId();
    if (uid) {
      const { error } = await addEmergencyContact(uid, {
        name: newName.trim(),
        role: newRole.trim(),
        contact_info: newContactInfo.trim(),
        notes: newNotes.trim(),
      });

      if (!error) {
        setAddSheetVisible(false);
        clearForm();
        await loadContacts();
      } else {
        setError('Failed to add contact. Please try again.');
      }
    }
    setSaving(false);
  };

  const handleDeleteContact = async (contactId: string) => {
    await deleteEmergencyContact(contactId);
    await loadContacts();
  };

  const clearForm = () => {
    setNewName('');
    setNewRole('');
    setNewContactInfo('');
    setNewNotes('');
    setError('');
  };

  const openAddSheet = () => {
    clearForm();
    setAddSheetVisible(true);
  };

  const closeAddSheet = () => {
    setAddSheetVisible(false);
    clearForm();
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
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
      </View>

      <ScrollView style={styles.contactsContainer}>
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="contacts" size={64} color="#A5B4FC" />
            <Text style={styles.emptyText}>No emergency contacts added yet</Text>
            <Text style={styles.emptySubtext}>
              Add emergency contacts for quick access during urgent situations
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <Icon name="account-alert" size={32} color="#DC2626" />
                <Text style={styles.contactName}>{contact.name}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.contactDetail}>
                <Text style={styles.contactLabel}>Role</Text>
                <Text style={styles.contactValue}>{contact.role || 'Not specified'}</Text>
              </View>
              <View style={styles.contactDetail}>
                <Text style={styles.contactLabel}>Contact Info</Text>
                <Text style={styles.contactValue}>{contact.contact_info}</Text>
              </View>
              {contact.notes && (
                <View style={styles.contactDetail}>
                  <Text style={styles.contactLabel}>Notes</Text>
                  <Text style={styles.contactValue}>{contact.notes}</Text>
                </View>
              )}
              <View style={styles.contactActions}>
                <Button
                  mode="contained"
                  icon="phone"
                  style={[styles.actionButton, { backgroundColor: '#22C55E' }]}
                  labelStyle={styles.actionButtonLabel}
                  onPress={() => Alert.alert('Calling', `Calling ${contact.name}...`)}
                >
                  Call
                </Button>
                <Button
                  mode="contained"
                  icon="message"
                  style={[styles.actionButton, { backgroundColor: '#3B82F6' }]}
                  labelStyle={styles.actionButtonLabel}
                  onPress={() => Alert.alert('Messaging', `Sending message to ${contact.name}...`)}
                >
                  Text
                </Button>
                <Button
                  mode="outlined"
                  icon="delete"
                  style={[styles.actionButton, { borderColor: '#EF4444', backgroundColor: '#fff' }]}
                  labelStyle={[styles.actionButtonLabel, { color: '#EF4444' }]}
                  onPress={() => handleDeleteContact(contact.id)}
                >
                  Delete
                </Button>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <FAB
        style={styles.fab}
        icon="plus"
        color="#FFFFFF"
        onPress={openAddSheet}
        accessibilityLabel="Add emergency contact"
      />

      <Animatable.View
        animation={addSheetVisible ? 'slideInUp' : 'slideOutDown'}
        duration={300}
        style={[
          styles.bottomSheet,
          { height: addSheetVisible ? SCREEN_HEIGHT * 0.7 : 0 }
        ]}
      >
        <Surface style={styles.bottomSheetContent} elevation={4}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Add Emergency Contact</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeAddSheet}
              accessibilityLabel="Close add contact sheet"
            />
          </View>
          <ScrollView style={styles.bottomSheetScroll} contentContainerStyle={styles.bottomSheetScrollContent}>
            <TextInput
              label="Name"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
              accessibilityLabel="Contact Name Input"
              autoFocus
            />
            <TextInput
              label="Role (e.g. GP, Caregiver, Emergency Services)"
              value={newRole}
              onChangeText={setNewRole}
              style={styles.input}
              accessibilityLabel="Role Input"
            />
            <TextInput
              label="Phone Number or Contact Info"
              value={newContactInfo}
              onChangeText={setNewContactInfo}
              style={styles.input}
              keyboardType="phone-pad"
              accessibilityLabel="Phone Number Input"
            />
            <TextInput
              label="Notes (optional)"
              value={newNotes}
              onChangeText={setNewNotes}
              style={styles.input}
              accessibilityLabel="Notes Input"
            />
            {!!error && <Text style={{ color: '#EF4444', fontSize: 18, marginTop: 4 }}>{error}</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
              <Button onPress={closeAddSheet} labelStyle={{ fontSize: 20 }}>Cancel</Button>
              <Button
                onPress={async () => { await handleAddContact(); if (!error) closeAddSheet(); }}
                loading={saving}
                disabled={saving}
                labelStyle={{ fontSize: 20 }}
                mode="contained"
                style={{ borderRadius: 12, backgroundColor: '#6366F1' }}
              >
                Save
              </Button>
            </View>
          </ScrollView>
        </Surface>
      </Animatable.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
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
  header: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#6366F1',
    textAlign: 'center',
  },
  contactsContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 12,
  },
  divider: {
    backgroundColor: '#E5E7EB',
    height: 1.5,
    marginVertical: 12,
  },
  contactDetail: {
    marginVertical: 6,
  },
  contactLabel: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 2,
  },
  contactValue: {
    fontSize: 22,
    color: '#111827',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 8,
    borderRadius: 12,
    paddingVertical: 8,
  },
  actionButtonLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: '#6366F1',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4B5563',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 18,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 26,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  bottomSheetContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '100%',
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  bottomSheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6366F1',
  },
  bottomSheetScroll: {
    flex: 1,
  },
  bottomSheetScrollContent: {
    padding: 24,
  },
  input: {
    fontSize: 20,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 12,
  },
});

export default EmergencyContactsScreen; 
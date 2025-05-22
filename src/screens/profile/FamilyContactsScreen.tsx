import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Dimensions } from 'react-native';
import { Text, Button, TextInput, Divider, FAB, Surface, IconButton } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchFamilyConnections, addFamilyConnection } from '../../services/supabase/profile';
import { getCurrentUserId } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Animatable from 'react-native-animatable';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FamilyContactsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'FamilyContacts'>;

type Props = {
  navigation: FamilyContactsScreenNavigationProp;
};

interface FamilyContact {
  id: string;
  name: string;
  relation: string;
  contact_info: string;
}

const FamilyContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [addSheetVisible, setAddSheetVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelation, setNewRelation] = useState('');
  const [newContactInfo, setNewContactInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    const uid = await getCurrentUserId();
    if (uid) {
      const { data, error } = await fetchFamilyConnections(uid);
      if (!error && data) {
        // Filter for regular family contacts (not emergency contacts)
        const familyContacts = data.filter(
          (contact: unknown) => (contact as { is_emergency?: boolean }).is_emergency === false
        ) as FamilyContact[];
        setContacts(familyContacts);
      }
    }
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
      const { error } = await addFamilyConnection(uid, {
        name: newName.trim(),
        relation: newRelation.trim(),
        contact_info: newContactInfo.trim(),
        is_emergency: false
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

  const clearForm = () => {
    setNewName('');
    setNewRelation('');
    setNewContactInfo('');
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
        <Text style={styles.title}>Family Contacts</Text>
      </View>

      <ScrollView style={styles.contactsContainer}>
        {contacts.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="account-group" size={64} color="#A5B4FC" />
            <Text style={styles.emptyText}>No family contacts added yet</Text>
            <Text style={styles.emptySubtext}>
              Add family members to keep in touch and share updates with them
            </Text>
          </View>
        ) : (
          contacts.map((contact) => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactHeader}>
                <Icon name="account-heart" size={32} color="#8B5CF6" />
                <Text style={styles.contactName}>{contact.name}</Text>
              </View>
              <Divider style={styles.divider} />
              <View style={styles.contactDetail}>
                <Text style={styles.contactLabel}>Relation</Text>
                <Text style={styles.contactValue}>{contact.relation || 'Not specified'}</Text>
              </View>
              <View style={styles.contactDetail}>
                <Text style={styles.contactLabel}>Contact Info</Text>
                <Text style={styles.contactValue}>{contact.contact_info}</Text>
              </View>
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
        accessibilityLabel="Add family contact"
      />

      {/* Modern Bottom Sheet for Add Contact */}
      <Animatable.View
        animation={addSheetVisible ? 'slideInUp' : 'slideOutDown'}
        duration={300}
        style={[
          styles.bottomSheet,
          { height: addSheetVisible ? SCREEN_HEIGHT * 0.6 : 0 }
        ]}
      >
        <Surface style={styles.bottomSheetContent} elevation={4}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Add Family Contact</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={closeAddSheet}
              accessibilityLabel="Close add contact sheet"
            />
          </View>
          <KeyboardAwareScrollView
            style={styles.bottomSheetScroll}
            contentContainerStyle={styles.bottomSheetScrollContent}
            enableOnAndroid
            extraScrollHeight={24}
            keyboardShouldPersistTaps="handled"
          >
            <TextInput
              label="Name"
              value={newName}
              onChangeText={setNewName}
              style={styles.input}
              accessibilityLabel="Contact Name Input"
              autoFocus={addSheetVisible}
            />
            <TextInput
              label="Relationship (optional)"
              value={newRelation}
              onChangeText={setNewRelation}
              style={styles.input}
              accessibilityLabel="Relationship Input"
            />
            <TextInput
              label="Phone Number"
              value={newContactInfo}
              onChangeText={setNewContactInfo}
              style={styles.input}
              keyboardType="phone-pad"
              accessibilityLabel="Phone Number Input"
            />
            {!!error && <Text style={{ color: '#EF4444', fontSize: 18, marginTop: 4 }}>{error}</Text>}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 }}>
              <Button onPress={closeAddSheet} labelStyle={{ fontSize: 20 }}>Cancel</Button>
              <Button
                onPress={handleAddContact}
                loading={saving}
                disabled={saving}
                labelStyle={{ fontSize: 20 }}
                mode="contained"
                style={{ borderRadius: 12, backgroundColor: '#6366F1' }}
              >
                Save
              </Button>
            </View>
          </KeyboardAwareScrollView>
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

export default FamilyContactsScreen; 
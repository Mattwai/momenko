import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Avatar, Button, List, TextInput, Divider, Chip, Dialog, Portal, Paragraph } from 'react-native-paper';
import { fetchUserProfile, fetchUserMemories, updateUserMemory, deleteUserMemory } from '../../services/supabase/profile';
import { getCurrentUserId, signOut } from '../../services/supabase/auth';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

type ProfileScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Profile'>;

type Props = {
  navigation: ProfileScreenNavigationProp;
};

interface Memory {
  id: string;
  user_id: string;
  type: string;
  content: string;
  metadata?: object;
  created_at: string;
}

const ProfileScreen: React.FC<Props> = ({ navigation }) => {
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);

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
        // Fetch user memories
        setMemoriesLoading(true);
        const { data: mems } = await fetchUserMemories(uid);
        setMemories(mems || []);
        setMemoriesLoading(false);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigation.replace('Login');
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditContent(memory.content);
  };

  const refreshMemories = async (userId: string) => {
    setMemoriesLoading(true);
    const { data: mems } = await fetchUserMemories(userId);
    setMemories(mems || []);
    setMemoriesLoading(false);
  };

  const handleSaveMemory = async (memory: Memory) => {
    await updateUserMemory(memory.id, editContent);
    if (memory.user_id) await refreshMemories(memory.user_id);
    setEditingMemoryId(null);
    setEditContent('');
  };

  const handleDeleteMemory = async (memory: Memory) => {
    setMemoryToDelete(memory);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMemory = async () => {
    if (memoryToDelete) {
      await deleteUserMemory(memoryToDelete.id);
      if (memoryToDelete.user_id) await refreshMemories(memoryToDelete.user_id);
    }
    setShowDeleteDialog(false);
    setMemoryToDelete(null);
  };

  const cancelDeleteMemory = () => {
    setShowDeleteDialog(false);
    setMemoryToDelete(null);
  };

  const menuItems = [
    {
      title: 'AI Memories',
      icon: 'brain',
      onPress: () => navigation.navigate({ name: 'Memories', params: undefined }),
    },
    {
      title: 'Personal Information',
      icon: 'account',
      onPress: () => {},
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
    <SafeAreaView style={{flex: 1}} edges={["top","left","right"]}>
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
          {/* Memory Viewer/Editor */}
          <Animatable.View animation="fadeInUp" delay={200}>
            <Text variant="titleMedium" style={{ marginBottom: 8, fontWeight: 'bold' }}>AI Memories</Text>
            {memoriesLoading ? (
              <Text>Loading memories...</Text>
            ) : memories.length === 0 ? (
              <Text>No memories found.</Text>
            ) : (
              memories.map((memory, idx) => (
                <React.Fragment key={memory.id}>
                  <View style={{ backgroundColor: '#fff', borderRadius: 8, marginBottom: 8, padding: 12 }}>
                    <Chip style={{ alignSelf: 'flex-start', marginBottom: 4, backgroundColor: '#E0E7FF' }} textStyle={{ color: '#3730A3' }}>{memory.type}</Chip>
                    {editingMemoryId === memory.id ? (
                      <>
                        <TextInput
                          value={editContent}
                          onChangeText={setEditContent}
                          style={{ backgroundColor: '#F3F4F6', marginVertical: 4 }}
                        />
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          <Button mode="contained" onPress={() => handleSaveMemory(memory)} style={{ flex: 1, marginRight: 8 }}>Save</Button>
                          <Button mode="outlined" onPress={() => setEditingMemoryId(null)} style={{ flex: 1 }}>Cancel</Button>
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={{ marginVertical: 4 }}>{memory.content}</Text>
                        <View style={{ flexDirection: 'row', marginTop: 4 }}>
                          <Button mode="text" onPress={() => handleEditMemory(memory)} style={{ flex: 1, marginRight: 8 }}>Edit</Button>
                          <Button mode="text" onPress={() => handleDeleteMemory(memory)} textColor="#EF4444" style={{ flex: 1 }}>Delete</Button>
                        </View>
                      </>
                    )}
                  </View>
                  {idx < memories.length - 1 && <Divider style={{ marginVertical: 4 }} />}
                </React.Fragment>
              ))
            )}
            <Portal>
              <Dialog visible={showDeleteDialog} onDismiss={cancelDeleteMemory}>
                <Dialog.Title>Delete Memory</Dialog.Title>
                <Dialog.Content>
                  <Paragraph>Are you sure you want to delete this memory?</Paragraph>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={cancelDeleteMemory}>Cancel</Button>
                  <Button onPress={confirmDeleteMemory} textColor="#EF4444">Delete</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          </Animatable.View>

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

          <Animatable.View animation="fadeInUp" delay={500}>
            <Button
              mode="contained"
              style={{ marginBottom: 16, backgroundColor: '#8B5CF6', borderRadius: 12 }}
              labelStyle={{ fontSize: 18 }}
              onPress={() => navigation.navigate('Family')}
              accessibilityLabel="Go to Family Dashboard"
            >
              Family Dashboard
            </Button>
          </Animatable.View>

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
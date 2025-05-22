import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, TextInput, Divider, Chip, Dialog, Portal, Paragraph } from 'react-native-paper';
import { fetchUserMemories, updateUserMemory, deleteUserMemory } from '../../services/supabase/profile';
import { getCurrentUserId } from '../../services/supabase/auth';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Memory {
  id: string;
  user_id: string;
  type: string;
  content: string;
  metadata?: object;
  created_at: string;
}

const MemoriesScreen: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUserId().then(uid => {
      setUserId(uid);
      if (uid) refreshMemories(uid);
    });
  }, []);

  const refreshMemories = async (uid: string) => {
    setMemoriesLoading(true);
    const { data: mems } = await fetchUserMemories(uid);
    setMemories(mems || []);
    setMemoriesLoading(false);
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemoryId(memory.id);
    setEditContent(memory.content);
  };

  const handleSaveMemory = async (memory: Memory) => {
    await updateUserMemory(memory.id, editContent);
    if (userId) await refreshMemories(userId);
    setEditingMemoryId(null);
    setEditContent('');
  };

  const handleDeleteMemory = (memory: Memory) => {
    setMemoryToDelete(memory);
    setShowDeleteDialog(true);
  };

  const confirmDeleteMemory = async () => {
    if (memoryToDelete && userId) {
      await deleteUserMemory(memoryToDelete.id);
      await refreshMemories(userId);
    }
    setShowDeleteDialog(false);
    setMemoryToDelete(null);
  };

  const cancelDeleteMemory = () => {
    setShowDeleteDialog(false);
    setMemoryToDelete(null);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="fadeInUp" delay={200}>
          <Text variant="titleLarge" style={{ marginBottom: 12, fontWeight: 'bold', textAlign: 'center' }}>AI Memories</Text>
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
});

export default MemoriesScreen; 
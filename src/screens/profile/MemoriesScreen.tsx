import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, TextInput, Divider, Chip, Dialog, Portal, Paragraph, IconButton, Modal } from 'react-native-paper';
import { fetchUserMemories, updateUserMemory, deleteUserMemory, addUserMemory } from '../../services/supabase/profile';
import { getCurrentUserId } from '../../services/supabase/auth';
import * as Animatable from 'react-native-animatable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Portal as PaperPortal } from 'react-native-paper';
import { ScrollView as RNScrollView } from 'react-native';
import { Platform, Dimensions } from 'react-native';

interface Memory {
  id: string;
  user_id: string;
  type: string;
  content: string;
  metadata?: object;
  created_at: string;
}

const MEMORY_TYPES = [
  'Person',
  'Event',
  'Fact',
  'Preference',
  'Other',
];

const MemoriesScreen: React.FC = () => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [editingMemoryId, setEditingMemoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [memoryToDelete, setMemoryToDelete] = useState<Memory | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newMemoryType, setNewMemoryType] = useState(MEMORY_TYPES[0]);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [adding, setAdding] = useState(false);

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

  const handleOpenAddModal = () => {
    setNewMemoryType(MEMORY_TYPES[0]);
    setNewMemoryContent('');
    setAddModalVisible(true);
  };
  const handleCloseAddModal = () => {
    setAddModalVisible(false);
    setNewMemoryContent('');
  };
  const handleAddMemory = async () => {
    if (!userId || !newMemoryContent.trim()) return;
    setAdding(true);
    await addUserMemory(userId, {
      type: newMemoryType,
      content: newMemoryContent.trim(),
    });
    await refreshMemories(userId);
    setAdding(false);
    setAddModalVisible(false);
    setNewMemoryContent('');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F3F4F6' }} edges={["top", "left", "right"]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <Animatable.View animation="fadeInUp" delay={200}>
          <Text style={styles.sectionHeader} accessibilityRole="header">AI Memories</Text>
          {memoriesLoading ? (
            <Text style={styles.loadingText}>Loading memories...</Text>
          ) : memories.length === 0 ? (
            <Text style={styles.noMemoriesText}>No memories found.</Text>
          ) : (
            memories.map((memory, idx) => (
              <React.Fragment key={memory.id}>
                <View style={styles.memoryCard} accessible accessibilityLabel={`Memory: ${memory.type}, ${memory.content}`}> 
                  <Chip style={styles.memoryChip} textStyle={styles.memoryChipText}>{memory.type}</Chip>
                  {editingMemoryId === memory.id ? (
                    <>
                      <TextInput
                        value={editContent}
                        onChangeText={setEditContent}
                        style={styles.memoryInput}
                        accessibilityLabel="Edit memory content"
                        autoFocus
                      />
                      <View style={styles.memoryActionsRow}>
                        <Button mode="contained" onPress={() => handleSaveMemory(memory)} style={styles.saveButton} labelStyle={{ fontSize: 18 }}>Save</Button>
                        <Button mode="outlined" onPress={() => setEditingMemoryId(null)} style={styles.cancelButton} labelStyle={{ fontSize: 18 }}>Cancel</Button>
                      </View>
                    </>
                  ) : (
                    <>
                      <Text style={styles.memoryContent}>{memory.content}</Text>
                      <View style={styles.memoryActionsRow}>
                        <IconButton icon="pencil" size={32} onPress={() => handleEditMemory(memory)} style={styles.iconButton} accessibilityLabel="Edit memory" />
                        <IconButton icon="delete" size={32} onPress={() => handleDeleteMemory(memory)} style={styles.iconButton} accessibilityLabel="Delete memory" />
                      </View>
                    </>
                  )}
                </View>
                {idx < memories.length - 1 && <Divider style={styles.memoryDivider} />}
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
      <View style={styles.fabContainer} pointerEvents="box-none">
        <Button
          mode="contained"
          icon="plus"
          style={styles.fab}
          labelStyle={styles.fabLabel}
          onPress={handleOpenAddModal}
          accessibilityLabel="Add Memory"
        >
          Add Memory
        </Button>
      </View>
      <PaperPortal>
        <Modal visible={addModalVisible} onDismiss={handleCloseAddModal} contentContainerStyle={styles.addModalContainer}>
          <RNScrollView contentContainerStyle={styles.addModalScrollContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.addModalTitle}>Add New Memory</Text>
            <View style={styles.memoryTypeRow}>
              {MEMORY_TYPES.map(type => (
                <Chip
                  key={type}
                  selected={newMemoryType === type}
                  onPress={() => setNewMemoryType(type)}
                  style={[styles.memoryTypeChip, newMemoryType === type && styles.memoryTypeChipSelected]}
                  textStyle={styles.memoryTypeChipText}
                  accessibilityLabel={`Select memory type: ${type}`}
                >
                  {type}
                </Chip>
              ))}
            </View>
            <TextInput
              value={newMemoryContent}
              onChangeText={setNewMemoryContent}
              style={styles.memoryInput}
              placeholder="Enter memory details..."
              accessibilityLabel="Memory content input"
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.memoryActionsRow}>
              <Button mode="contained" onPress={handleAddMemory} loading={adding} disabled={adding || !newMemoryContent.trim()} style={styles.saveButton} labelStyle={{ fontSize: 18 }}>Save</Button>
              <Button mode="outlined" onPress={handleCloseAddModal} disabled={adding} style={styles.cancelButton} labelStyle={{ fontSize: 18 }}>Cancel</Button>
            </View>
          </RNScrollView>
        </Modal>
      </PaperPortal>
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
    paddingBottom: 120,
    paddingTop: 8,
  },
  sectionHeader: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#6366F1',
    marginTop: 0,
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 1,
  },
  memoryCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  memoryChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#E0E7FF',
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 16,
  },
  memoryChipText: {
    color: '#3730A3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  memoryContent: {
    fontSize: 22,
    color: '#1F2937',
    marginVertical: 8,
  },
  memoryInput: {
    backgroundColor: '#F3F4F6',
    fontSize: 22,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    minHeight: 60,
  },
  memoryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  iconButton: {
    marginHorizontal: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
  },
  memoryDivider: {
    marginVertical: 8,
  },
  addButton: {
    // removed, replaced by fab
  },
  fabContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'box-none',
  },
  fab: {
    borderRadius: 32,
    backgroundColor: '#6366F1',
    paddingVertical: 16,
    paddingHorizontal: 36,
    elevation: 6,
    minWidth: 180,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  fabLabel: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    textAlign: 'center',
    marginLeft: 8,
  },
  addModalContainer: {
    backgroundColor: 'white',
    marginHorizontal: 0,
    borderRadius: 24,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    maxHeight: '90%',
    width: Dimensions.get('window').width - 32,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  addModalScrollContent: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 320,
  },
  addModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6366F1',
    marginBottom: 16,
    textAlign: 'center',
  },
  memoryTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 8,
  },
  memoryTypeChip: {
    margin: 4,
    backgroundColor: '#E0E7FF',
    borderRadius: 16,
    height: 36,
    paddingHorizontal: 12,
  },
  memoryTypeChipSelected: {
    backgroundColor: '#6366F1',
  },
  memoryTypeChipText: {
    fontSize: 16,
    color: '#3730A3',
    fontWeight: 'bold',
  },
  loadingText: {
    fontSize: 22,
    color: '#6366F1',
    textAlign: 'center',
    marginVertical: 32,
  },
  noMemoriesText: {
    fontSize: 22,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 32,
  },
  saveButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    flex: 1,
  },
});

export default MemoriesScreen; 
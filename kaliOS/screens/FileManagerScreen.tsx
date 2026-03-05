import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: number;
  permissions?: string;
}

interface VirtualFS {
  [path: string]: FileItem[];
}

const DEFAULT_FS: VirtualFS = {
  '/': [
    { name: 'home', type: 'directory' },
    { name: 'etc', type: 'directory' },
    { name: 'usr', type: 'directory' },
    { name: 'var', type: 'directory' },
    { name: 'tmp', type: 'directory' },
    { name: 'root', type: 'directory' },
  ],
  '/home': [
    { name: 'kali', type: 'directory' },
  ],
  '/home/kali': [
    { name: 'Desktop', type: 'directory' },
    { name: 'Documents', type: 'directory' },
    { name: 'Downloads', type: 'directory' },
    { name: '.bashrc', type: 'file', size: 3526 },
    { name: '.zshrc', type: 'file', size: 4521 },
  ],
  '/home/kali/Documents': [
    { name: 'notes.txt', type: 'file', size: 1024 },
    { name: 'scripts', type: 'directory' },
  ],
  '/home/kali/Documents/scripts': [
    { name: 'scan.sh', type: 'file', size: 512 },
    { name: 'backup.py', type: 'file', size: 2048 },
  ],
  '/etc': [
    { name: 'passwd', type: 'file', size: 2048 },
    { name: 'hosts', type: 'file', size: 256 },
    { name: 'resolv.conf', type: 'file', size: 128 },
  ],
  '/root': [
    { name: '.bash_history', type: 'file', size: 8192 },
  ],
  '/tmp': [],
  '/usr': [
    { name: 'bin', type: 'directory' },
    { name: 'share', type: 'directory' },
  ],
  '/var': [
    { name: 'log', type: 'directory' },
    { name: 'www', type: 'directory' },
  ],
};

export default function FileManagerScreen() {
  const [currentPath, setCurrentPath] = useState('/home/kali');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [fs, setFs] = useState<VirtualFS>(DEFAULT_FS);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState<'file' | 'directory'>('file');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  useEffect(() => {
    loadFS();
  }, []);

  useEffect(() => {
    setFiles(fs[currentPath] || []);
  }, [currentPath, fs]);

  const loadFS = async () => {
    try {
      const saved = await AsyncStorage.getItem('virtual_fs');
      if (saved) {
        setFs(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading FS:', error);
    }
  };

  const saveFS = async (newFs: VirtualFS) => {
    try {
      await AsyncStorage.setItem('virtual_fs', JSON.stringify(newFs));
      setFs(newFs);
    } catch (error) {
      console.error('Error saving FS:', error);
    }
  };

  const navigateTo = (item: FileItem) => {
    if (item.type === 'directory') {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setCurrentPath(newPath);
    } else {
      setSelectedFile(item);
    }
  };

  const goUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || '/');
  };

  const createItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newItem: FileItem = {
      name: newItemName.trim(),
      type: newItemType,
      size: newItemType === 'file' ? 0 : undefined,
      modified: Date.now(),
    };

    const currentFiles = fs[currentPath] || [];
    if (currentFiles.some(f => f.name === newItem.name)) {
      Alert.alert('Error', 'Item already exists');
      return;
    }

    const newFs = {
      ...fs,
      [currentPath]: [...currentFiles, newItem],
    };

    if (newItemType === 'directory') {
      const newDirPath = currentPath === '/' ? `/${newItem.name}` : `${currentPath}/${newItem.name}`;
      newFs[newDirPath] = [];
    }

    saveFS(newFs);
    setShowNewModal(false);
    setNewItemName('');
  };

  const deleteItem = (item: FileItem) => {
    Alert.alert(
      'Delete',
      `Delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newFs = { ...fs };
            newFs[currentPath] = (newFs[currentPath] || []).filter(f => f.name !== item.name);

            if (item.type === 'directory') {
              const dirPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
              delete newFs[dirPath];
            }

            saveFS(newFs);
          },
        },
      ]
    );
  };

  const getIcon = (item: FileItem) => {
    if (item.type === 'directory') return 'folder';
    const ext = item.name.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'txt': return 'document-text';
      case 'sh': return 'terminal';
      case 'py': return 'logo-python';
      case 'js': return 'logo-javascript';
      default: return 'document';
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '--';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const renderItem = ({ item, index }: { item: FileItem; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 30)}>
      <TouchableOpacity
        style={styles.fileItem}
        onPress={() => navigateTo(item)}
        onLongPress={() => deleteItem(item)}
      >
        <View style={[styles.fileIcon, item.type === 'directory' && styles.folderIcon]}>
          <Ionicons
            name={getIcon(item) as any}
            size={24}
            color={item.type === 'directory' ? '#ffd700' : '#00ff00'}
          />
        </View>
        <View style={styles.fileInfo}>
          <Text style={styles.fileName}>{item.name}</Text>
          <Text style={styles.fileSize}>
            {item.type === 'directory' ? 'Directory' : formatSize(item.size)}
          </Text>
        </View>
        {item.type === 'directory' && (
          <Ionicons name="chevron-forward" size={20} color="#666" />
        )}
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Path Bar */}
      <View style={styles.pathBar}>
        <TouchableOpacity onPress={goUp} disabled={currentPath === '/'}>
          <Ionicons
            name="arrow-up-circle"
            size={28}
            color={currentPath === '/' ? '#333' : '#00ff00'}
          />
        </TouchableOpacity>
        <Text style={styles.pathText} numberOfLines={1}>
          {currentPath}
        </Text>
        <TouchableOpacity onPress={() => setShowNewModal(true)}>
          <Ionicons name="add-circle" size={28} color="#00ff00" />
        </TouchableOpacity>
      </View>

      {/* File List */}
      <FlatList
        data={files}
        renderItem={renderItem}
        keyExtractor={item => item.name}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={60} color="#333" />
            <Text style={styles.emptyText}>Empty directory</Text>
          </View>
        }
      />

      {/* New Item Modal */}
      <Modal
        visible={showNewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={FadeIn} style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New</Text>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, newItemType === 'file' && styles.typeButtonActive]}
                onPress={() => setNewItemType('file')}
              >
                <Ionicons name="document" size={20} color={newItemType === 'file' ? '#00ff00' : '#666'} />
                <Text style={[styles.typeButtonText, newItemType === 'file' && styles.typeButtonTextActive]}>
                  File
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, newItemType === 'directory' && styles.typeButtonActive]}
                onPress={() => setNewItemType('directory')}
              >
                <Ionicons name="folder" size={20} color={newItemType === 'directory' ? '#ffd700' : '#666'} />
                <Text style={[styles.typeButtonText, newItemType === 'directory' && styles.typeButtonTextActive]}>
                  Folder
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter name..."
              placeholderTextColor="#666"
              value={newItemName}
              onChangeText={setNewItemName}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowNewModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={createItem}
              >
                <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>Create</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* File Preview Modal */}
      <Modal
        visible={selectedFile !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFile(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewContent}>
            <View style={styles.previewHeader}>
              <Ionicons name={getIcon(selectedFile || { name: '', type: 'file' }) as any} size={24} color="#00ff00" />
              <Text style={styles.previewTitle}>{selectedFile?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.previewBody}>
              <Text style={styles.previewLabel}>Size:</Text>
              <Text style={styles.previewValue}>{formatSize(selectedFile?.size)}</Text>
              <Text style={styles.previewLabel}>Type:</Text>
              <Text style={styles.previewValue}>{selectedFile?.name.split('.').pop()?.toUpperCase() || 'Unknown'}</Text>
              <Text style={styles.previewLabel}>Path:</Text>
              <Text style={styles.previewValue}>{currentPath}/{selectedFile?.name}</Text>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  pathBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#00ff0030',
  },
  pathText: {
    flex: 1,
    color: '#00ff00',
    fontFamily: 'monospace',
    fontSize: 14,
    marginHorizontal: 12,
  },
  listContent: {
    padding: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  fileIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#00ff0015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  folderIcon: {
    backgroundColor: '#ffd70015',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
  },
  fileName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  fileSize: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#2a2a3e',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  typeButtonActive: {
    borderColor: '#00ff00',
    backgroundColor: '#00ff0015',
  },
  typeButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#00ff00',
  },
  modalInput: {
    backgroundColor: '#0f0f1a',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#00ff00',
  },
  modalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalButtonTextPrimary: {
    color: '#000',
  },
  previewContent: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#0f0f1a',
  },
  previewTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  previewBody: {
    padding: 16,
  },
  previewLabel: {
    color: '#666',
    fontSize: 12,
    marginTop: 12,
  },
  previewValue: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
});

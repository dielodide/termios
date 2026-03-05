import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

interface TerminalSession {
  id: string;
  name: string;
  lastUsed: number;
  status: 'active' | 'idle';
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [sessions, setSessions] = useState<TerminalSession[]>([]);
  const [isKaliInstalled, setIsKaliInstalled] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const installed = await AsyncStorage.getItem('kali_installed');
      setIsKaliInstalled(installed === 'true');

      const savedSessions = await AsyncStorage.getItem('terminal_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const createNewSession = async () => {
    const newSession: TerminalSession = {
      id: Date.now().toString(),
      name: `Session ${sessions.length + 1}`,
      lastUsed: Date.now(),
      status: 'active',
    };

    const updatedSessions = [newSession, ...sessions];
    setSessions(updatedSessions);
    await AsyncStorage.setItem('terminal_sessions', JSON.stringify(updatedSessions));
    navigation.navigate('Terminal', { sessionId: newSession.id });
  };

  const deleteSession = async (id: string) => {
    Alert.alert(
      'Delete Session',
      'Are you sure you want to delete this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedSessions = sessions.filter(s => s.id !== id);
            setSessions(updatedSessions);
            await AsyncStorage.setItem('terminal_sessions', JSON.stringify(updatedSessions));
          },
        },
      ]
    );
  };

  const renderSession = ({ item, index }: { item: TerminalSession; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 100)}>
      <TouchableOpacity
        style={styles.sessionCard}
        onPress={() => navigation.navigate('Terminal', { sessionId: item.id })}
        onLongPress={() => deleteSession(item.id)}
      >
        <View style={styles.sessionIcon}>
          <Ionicons name="terminal" size={24} color="#00ff00" />
        </View>
        <View style={styles.sessionInfo}>
          <Text style={styles.sessionName}>{item.name}</Text>
          <Text style={styles.sessionDate}>
            Last used: {new Date(item.lastUsed).toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: item.status === 'active' ? '#00ff00' : '#666' }]} />
      </TouchableOpacity>
    </Animated.View>
  );

  const renderHeader = () => (
    <Animated.View entering={FadeInUp.duration(500)}>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Ionicons name="skull" size={60} color="#00ff00" />
          <Text style={styles.logoText}>TermiOS</Text>
          <Text style={styles.logoSubtext}>Kali Linux Terminal</Text>
        </View>

        {!isKaliInstalled && (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={() => navigation.navigate('Setup')}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.setupButtonText}>Setup Kali Linux</Text>
          </TouchableOpacity>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={createNewSession}
          >
            <Ionicons name="add-circle" size={24} color="#00ff00" />
            <Text style={styles.actionText}>New Terminal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('FileManager')}
          >
            <Ionicons name="folder" size={24} color="#00ff00" />
            <Text style={styles.actionText}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings" size={24} color="#00ff00" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      {sessions.length > 0 && (
        <Text style={styles.sectionTitle}>Recent Sessions</Text>
      )}
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="terminal-outline" size={80} color="#333" />
      <Text style={styles.emptyText}>No terminal sessions</Text>
      <Text style={styles.emptySubtext}>Tap "New Terminal" to start</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#00ff00',
    marginTop: 8,
  },
  logoSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  setupButton: {
    backgroundColor: '#557a95',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00ff0030',
    minWidth: 100,
  },
  actionText: {
    color: '#00ff00',
    marginTop: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00ff0020',
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ff0015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#444',
    marginTop: 4,
  },
});

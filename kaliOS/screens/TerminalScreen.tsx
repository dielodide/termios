import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';
import { executeCommand, CommandOutput } from '../lib/shell';
import Animated, { FadeIn } from 'react-native-reanimated';

type TerminalScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Terminal'>;
  route: RouteProp<RootStackParamList, 'Terminal'>;
};

interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  content: string;
  timestamp: number;
}

const PROMPT = '┌──(kali㉿termios)-[~]\n└─$ ';

export default function TerminalScreen({ navigation, route }: TerminalScreenProps) {
  const [lines, setLines] = useState<TerminalLine[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentDir, setCurrentDir] = useState('~');
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    initializeTerminal();
  }, []);

  const initializeTerminal = async () => {
    const welcomeLines: TerminalLine[] = [
      {
        id: '1',
        type: 'system',
        content: '┌──────────────────────────────────────────────────────────┐',
        timestamp: Date.now(),
      },
      {
        id: '2',
        type: 'system',
        content: '│         Welcome to TermiOS - Kali Linux Terminal         │',
        timestamp: Date.now(),
      },
      {
        id: '3',
        type: 'system',
        content: '│                                                          │',
        timestamp: Date.now(),
      },
      {
        id: '4',
        type: 'system',
        content: '│  Type "help" for available commands                     │',
        timestamp: Date.now(),
      },
      {
        id: '5',
        type: 'system',
        content: '│  Type "setup" to configure Kali rootfs                  │',
        timestamp: Date.now(),
      },
      {
        id: '6',
        type: 'system',
        content: '└──────────────────────────────────────────────────────────┘',
        timestamp: Date.now(),
      },
      {
        id: '7',
        type: 'system',
        content: '',
        timestamp: Date.now(),
      },
    ];
    setLines(welcomeLines);

    // Load command history
    try {
      const history = await AsyncStorage.getItem('command_history');
      if (history) {
        setCommandHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const getPrompt = useCallback(() => {
    return `┌──(kali㉿termios)-[${currentDir}]\n└─$ `;
  }, [currentDir]);

  const handleSubmit = async () => {
    if (!currentInput.trim() || isProcessing) return;

    const command = currentInput.trim();
    setCurrentInput('');
    setIsProcessing(true);

    // Add input line
    const inputLine: TerminalLine = {
      id: Date.now().toString(),
      type: 'input',
      content: `${getPrompt()}${command}`,
      timestamp: Date.now(),
    };

    setLines(prev => [...prev, inputLine]);

    // Save to history
    const newHistory = [command, ...commandHistory.filter(c => c !== command)].slice(0, 100);
    setCommandHistory(newHistory);
    setHistoryIndex(-1);
    await AsyncStorage.setItem('command_history', JSON.stringify(newHistory));

    // Execute command
    const result = await executeCommand(command, currentDir);

    // Handle directory change
    if (result.newDir) {
      setCurrentDir(result.newDir);
    }

    // Add output lines
    if (result.output) {
      const outputLines = result.output.split('\n').map((line, index) => ({
        id: `${Date.now()}-${index}`,
        type: result.isError ? 'error' as const : 'output' as const,
        content: line,
        timestamp: Date.now(),
      }));
      setLines(prev => [...prev, ...outputLines]);
    }

    setIsProcessing(false);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);
  };

  const handleHistoryNavigation = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    if (direction === 'up') {
      const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
      setHistoryIndex(newIndex);
      setCurrentInput(commandHistory[newIndex] || '');
    } else {
      const newIndex = Math.max(historyIndex - 1, -1);
      setHistoryIndex(newIndex);
      setCurrentInput(newIndex >= 0 ? commandHistory[newIndex] : '');
    }
  };

  const renderLine = (line: TerminalLine) => {
    let textColor = '#00ff00';
    if (line.type === 'error') textColor = '#ff4444';
    if (line.type === 'system') textColor = '#00aaff';
    if (line.type === 'output') textColor = '#ffffff';

    return (
      <Animated.View key={line.id} entering={FadeIn.duration(100)}>
        <Text style={[styles.terminalText, { color: textColor }]}>
          {line.content}
        </Text>
      </Animated.View>
    );
  };

  const QuickKey = ({ label, onPress, icon }: { label: string; onPress: () => void; icon?: string }) => (
    <TouchableOpacity style={styles.quickKey} onPress={onPress}>
      {icon ? (
        <Ionicons name={icon as any} size={16} color="#00ff00" />
      ) : (
        <Text style={styles.quickKeyText}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#00ff00" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kali Terminal</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#00ff00" />
        </TouchableOpacity>
      </View>

      {/* Terminal Output */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.outputContainer}
          contentContainerStyle={styles.outputContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {lines.map(renderLine)}

          {/* Current Input Line */}
          <View style={styles.inputLineContainer}>
            <Text style={styles.prompt}>{getPrompt()}</Text>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={currentInput}
              onChangeText={setCurrentInput}
              onSubmitEditing={handleSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              returnKeyType="send"
              placeholderTextColor="#444"
              editable={!isProcessing}
            />
            {isProcessing && (
              <Text style={styles.processingIndicator}>⏳</Text>
            )}
          </View>
        </ScrollView>

        {/* Quick Keys */}
        <View style={styles.quickKeysContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <QuickKey label="TAB" onPress={() => setCurrentInput(prev => prev + '\t')} />
            <QuickKey label="|" onPress={() => setCurrentInput(prev => prev + '|')} />
            <QuickKey label="&" onPress={() => setCurrentInput(prev => prev + '&')} />
            <QuickKey label="<" onPress={() => setCurrentInput(prev => prev + '<')} />
            <QuickKey label=">" onPress={() => setCurrentInput(prev => prev + '>')} />
            <QuickKey label="/" onPress={() => setCurrentInput(prev => prev + '/')} />
            <QuickKey label="~" onPress={() => setCurrentInput(prev => prev + '~')} />
            <QuickKey label="-" onPress={() => setCurrentInput(prev => prev + '-')} />
            <QuickKey label="_" onPress={() => setCurrentInput(prev => prev + '_')} />
            <QuickKey icon="arrow-up" onPress={() => handleHistoryNavigation('up')} />
            <QuickKey icon="arrow-down" onPress={() => handleHistoryNavigation('down')} />
            <QuickKey label="CTRL" onPress={() => {}} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#00ff0030',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ff00',
  },
  keyboardAvoid: {
    flex: 1,
  },
  outputContainer: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  outputContent: {
    padding: 12,
    paddingBottom: 20,
  },
  terminalText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  inputLineContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  prompt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#00ff00',
    lineHeight: 18,
  },
  input: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    color: '#fff',
    padding: 0,
    marginLeft: 4,
    lineHeight: 18,
  },
  processingIndicator: {
    fontSize: 14,
    marginLeft: 8,
  },
  quickKeysContainer: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#00ff0030',
  },
  quickKey: {
    backgroundColor: '#2a2a3e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00ff0040',
  },
  quickKeyText: {
    color: '#00ff00',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    fontWeight: '600',
  },
});

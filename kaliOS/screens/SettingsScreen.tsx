import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface Settings {
  fontSize: number;
  vibration: boolean;
  soundEffects: boolean;
  autoScroll: boolean;
  showTimestamps: boolean;
  theme: 'kali' | 'matrix' | 'classic';
}

const DEFAULT_SETTINGS: Settings = {
  fontSize: 13,
  vibration: true,
  soundEffects: false,
  autoScroll: true,
  showTimestamps: false,
  theme: 'kali',
};

export default function SettingsScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('terminal_settings');
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await AsyncStorage.setItem('terminal_settings', JSON.stringify(newSettings));
  };

  const clearHistory = () => {
    Alert.alert(
      'Clear History',
      'This will delete all command history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('command_history');
            Alert.alert('Done', 'Command history cleared');
          },
        },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'Reset all settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setSettings(DEFAULT_SETTINGS);
            await AsyncStorage.setItem('terminal_settings', JSON.stringify(DEFAULT_SETTINGS));
          },
        },
      ]
    );
  };

  const SettingRow = ({
    icon,
    title,
    subtitle,
    children,
    index,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    children?: React.ReactNode;
    index: number;
  }) => (
    <Animated.View entering={FadeInDown.delay(index * 50)}>
      <View style={styles.settingRow}>
        <View style={styles.settingIcon}>
          <Ionicons name={icon as any} size={22} color="#00ff00" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
        {children}
      </View>
    </Animated.View>
  );

  const ThemeButton = ({ theme, label }: { theme: Settings['theme']; label: string }) => (
    <TouchableOpacity
      style={[
        styles.themeButton,
        settings.theme === theme && styles.themeButtonActive,
      ]}
      onPress={() => updateSetting('theme', theme)}
    >
      <Text
        style={[
          styles.themeButtonText,
          settings.theme === theme && styles.themeButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Appearance */}
        <Text style={styles.sectionTitle}>Appearance</Text>

        <SettingRow
          icon="text"
          title="Font Size"
          subtitle={`${settings.fontSize}px`}
          index={0}
        >
          <View style={styles.fontSizeControls}>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => updateSetting('fontSize', Math.max(10, settings.fontSize - 1))}
            >
              <Ionicons name="remove" size={20} color="#00ff00" />
            </TouchableOpacity>
            <Text style={styles.fontSizeValue}>{settings.fontSize}</Text>
            <TouchableOpacity
              style={styles.fontSizeButton}
              onPress={() => updateSetting('fontSize', Math.min(20, settings.fontSize + 1))}
            >
              <Ionicons name="add" size={20} color="#00ff00" />
            </TouchableOpacity>
          </View>
        </SettingRow>

        <Animated.View entering={FadeInDown.delay(50)}>
          <View style={styles.themeSection}>
            <Text style={styles.themeSectionTitle}>Theme</Text>
            <View style={styles.themeButtons}>
              <ThemeButton theme="kali" label="Kali" />
              <ThemeButton theme="matrix" label="Matrix" />
              <ThemeButton theme="classic" label="Classic" />
            </View>
          </View>
        </Animated.View>

        {/* Behavior */}
        <Text style={styles.sectionTitle}>Behavior</Text>

        <SettingRow
          icon="phone-portrait"
          title="Vibration"
          subtitle="Vibrate on key press"
          index={2}
        >
          <Switch
            value={settings.vibration}
            onValueChange={(value) => updateSetting('vibration', value)}
            trackColor={{ false: '#333', true: '#00ff0060' }}
            thumbColor={settings.vibration ? '#00ff00' : '#666'}
          />
        </SettingRow>

        <SettingRow
          icon="volume-high"
          title="Sound Effects"
          subtitle="Play sounds on actions"
          index={3}
        >
          <Switch
            value={settings.soundEffects}
            onValueChange={(value) => updateSetting('soundEffects', value)}
            trackColor={{ false: '#333', true: '#00ff0060' }}
            thumbColor={settings.soundEffects ? '#00ff00' : '#666'}
          />
        </SettingRow>

        <SettingRow
          icon="arrow-down"
          title="Auto Scroll"
          subtitle="Scroll to bottom on new output"
          index={4}
        >
          <Switch
            value={settings.autoScroll}
            onValueChange={(value) => updateSetting('autoScroll', value)}
            trackColor={{ false: '#333', true: '#00ff0060' }}
            thumbColor={settings.autoScroll ? '#00ff00' : '#666'}
          />
        </SettingRow>

        <SettingRow
          icon="time"
          title="Show Timestamps"
          subtitle="Display time for each command"
          index={5}
        >
          <Switch
            value={settings.showTimestamps}
            onValueChange={(value) => updateSetting('showTimestamps', value)}
            trackColor={{ false: '#333', true: '#00ff0060' }}
            thumbColor={settings.showTimestamps ? '#00ff00' : '#666'}
          />
        </SettingRow>

        {/* Data */}
        <Text style={styles.sectionTitle}>Data</Text>

        <TouchableOpacity onPress={clearHistory}>
          <SettingRow
            icon="trash"
            title="Clear Command History"
            subtitle="Delete all saved commands"
            index={6}
          >
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </SettingRow>
        </TouchableOpacity>

        <TouchableOpacity onPress={resetSettings}>
          <SettingRow
            icon="refresh"
            title="Reset Settings"
            subtitle="Restore default settings"
            index={7}
          >
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </SettingRow>
        </TouchableOpacity>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>

        <Animated.View entering={FadeInDown.delay(400)}>
          <View style={styles.aboutSection}>
            <Ionicons name="skull" size={40} color="#00ff00" />
            <Text style={styles.aboutTitle}>TermiOS Kali</Text>
            <Text style={styles.aboutVersion}>Version 1.0.0</Text>
            <Text style={styles.aboutDesc}>
              A Kali Linux terminal emulator for iOS devices.
              Powered by React Native & Expo.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff00',
    marginTop: 24,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00ff0015',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  fontSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fontSizeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00ff0020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fontSizeValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
  },
  themeSection: {
    backgroundColor: '#1a1a2e',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  themeSectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 12,
  },
  themeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  themeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2a2a3e',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeButtonActive: {
    backgroundColor: '#00ff0020',
    borderColor: '#00ff00',
  },
  themeButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  themeButtonTextActive: {
    color: '#00ff00',
  },
  aboutSection: {
    backgroundColor: '#1a1a2e',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00ff00',
    marginTop: 12,
  },
  aboutVersion: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  aboutDesc: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
  },
});

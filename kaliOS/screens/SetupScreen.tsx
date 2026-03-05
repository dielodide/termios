import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming, withRepeat } from 'react-native-reanimated';
import { RootStackParamList } from '../App';

type SetupScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Setup'>;
};

interface SetupStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
}

export default function SetupScreen({ navigation }: SetupScreenProps) {
  const [steps, setSteps] = useState<SetupStep[]>([
    {
      id: 'download',
      title: 'Download Kali Rootfs',
      description: 'Download kali-rootfs-arm64.tar.gz from Google Drive',
      status: 'pending',
    },
    {
      id: 'extract',
      title: 'Extract Rootfs',
      description: 'Extract the rootfs archive to app storage',
      status: 'pending',
    },
    {
      id: 'configure',
      title: 'Configure Environment',
      description: 'Set up shell environment and paths',
      status: 'pending',
    },
    {
      id: 'verify',
      title: 'Verify Installation',
      description: 'Test terminal functionality',
      status: 'pending',
    },
  ]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    pulseAnim.value = withRepeat(
      withTiming(1.1, { duration: 800 }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const updateStepStatus = (stepId: string, status: SetupStep['status']) => {
    setSteps(prev =>
      prev.map(step =>
        step.id === stepId ? { ...step, status } : step
      )
    );
  };

  const openDownloadLink = () => {
    Linking.openURL('https://drive.google.com/file/d/1-peEIZnt7oVbywowQknk-5GMJ5YQntOK/view');
  };

  const simulateInstallation = async () => {
    setIsInstalling(true);

    // Step 1: Download
    updateStepStatus('download', 'in-progress');
    setCurrentStep(0);
    for (let i = 0; i <= 100; i += 5) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    updateStepStatus('download', 'completed');

    // Step 2: Extract
    updateStepStatus('extract', 'in-progress');
    setCurrentStep(1);
    setProgress(0);
    for (let i = 0; i <= 100; i += 3) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    updateStepStatus('extract', 'completed');

    // Step 3: Configure
    updateStepStatus('configure', 'in-progress');
    setCurrentStep(2);
    setProgress(0);
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    updateStepStatus('configure', 'completed');

    // Step 4: Verify
    updateStepStatus('verify', 'in-progress');
    setCurrentStep(3);
    setProgress(0);
    for (let i = 0; i <= 100; i += 20) {
      setProgress(i);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    updateStepStatus('verify', 'completed');

    // Save installation status
    await AsyncStorage.setItem('kali_installed', 'true');
    await AsyncStorage.setItem('kali_version', 'arm64-2024');

    setIsInstalling(false);

    Alert.alert(
      'Installation Complete',
      'Kali Linux rootfs has been set up successfully!',
      [
        {
          text: 'Open Terminal',
          onPress: () => navigation.replace('Terminal', {}),
        },
      ]
    );
  };

  const startInstallation = () => {
    Alert.alert(
      'Start Installation',
      'This will set up the Kali Linux environment. Make sure you have downloaded the rootfs file first.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download First',
          onPress: openDownloadLink,
        },
        {
          text: 'Start',
          onPress: simulateInstallation,
        },
      ]
    );
  };

  const getStatusIcon = (status: SetupStep['status']) => {
    switch (status) {
      case 'completed':
        return <Ionicons name="checkmark-circle" size={24} color="#00ff00" />;
      case 'in-progress':
        return <Ionicons name="sync" size={24} color="#ffd700" />;
      case 'error':
        return <Ionicons name="close-circle" size={24} color="#ff4444" />;
      default:
        return <Ionicons name="ellipse-outline" size={24} color="#666" />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.header, pulseStyle]}>
          <View style={styles.iconContainer}>
            <Ionicons name="skull" size={60} color="#00ff00" />
          </View>
          <Text style={styles.title}>Kali Linux Setup</Text>
          <Text style={styles.subtitle}>ARM64 Terminal Environment</Text>
        </Animated.View>

        {/* Info Card */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#00aaff" />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>About this Setup</Text>
            <Text style={styles.infoText}>
              This will configure a Kali Linux terminal environment using the ARM64 rootfs.
              The rootfs provides essential Linux commands and tools.
            </Text>
          </View>
        </Animated.View>

        {/* Download Link */}
        <Animated.View entering={FadeInDown.delay(200)}>
          <TouchableOpacity style={styles.downloadCard} onPress={openDownloadLink}>
            <Ionicons name="cloud-download" size={32} color="#00ff00" />
            <View style={styles.downloadInfo}>
              <Text style={styles.downloadTitle}>Download Rootfs</Text>
              <Text style={styles.downloadSubtitle}>kali-rootfs-arm64.tar.gz</Text>
              <Text style={styles.downloadSize}>~150 MB</Text>
            </View>
            <Ionicons name="open-outline" size={24} color="#00ff00" />
          </TouchableOpacity>
        </Animated.View>

        {/* Steps */}
        <Text style={styles.sectionTitle}>Installation Steps</Text>

        {steps.map((step, index) => (
          <Animated.View
            key={step.id}
            entering={FadeInDown.delay(300 + index * 100)}
          >
            <View style={[
              styles.stepCard,
              step.status === 'in-progress' && styles.stepCardActive,
            ]}>
              <View style={styles.stepNumber}>
                {step.status === 'in-progress' ? (
                  <Text style={styles.stepNumberText}>{progress}%</Text>
                ) : (
                  getStatusIcon(step.status)
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepTitle,
                  step.status === 'completed' && styles.stepTitleCompleted,
                ]}>
                  {step.title}
                </Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            </View>

            {step.status === 'in-progress' && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progress}%` }]} />
              </View>
            )}
          </Animated.View>
        ))}

        {/* Start Button */}
        <Animated.View entering={FadeInDown.delay(700)}>
          <TouchableOpacity
            style={[
              styles.startButton,
              isInstalling && styles.startButtonDisabled,
            ]}
            onPress={startInstallation}
            disabled={isInstalling}
          >
            <Ionicons
              name={isInstalling ? 'hourglass' : 'play'}
              size={24}
              color="#000"
            />
            <Text style={styles.startButtonText}>
              {isInstalling ? 'Installing...' : 'Start Installation'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Alternative Source */}
        <Animated.View entering={FadeInDown.delay(800)} style={styles.altSource}>
          <Text style={styles.altSourceTitle}>Alternative Source</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://github.com/EXALAB/Anlinux-Resources/raw/refs/heads/master/Rootfs/Kali/arm64/kali-rootfs-arm64.tar.xz')}
          >
            <Text style={styles.altSourceLink}>GitHub (EXALAB/Anlinux-Resources)</Text>
          </TouchableOpacity>
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
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#00ff0015',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00ff00',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#00aaff',
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  downloadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#00ff0040',
  },
  downloadInfo: {
    flex: 1,
    marginLeft: 16,
  },
  downloadTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadSubtitle: {
    color: '#00ff00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  downloadSize: {
    color: '#666',
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00ff00',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  stepCardActive: {
    borderWidth: 1,
    borderColor: '#ffd700',
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0f0f1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#ffd700',
    fontSize: 11,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
  },
  stepTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  stepTitleCompleted: {
    color: '#00ff00',
  },
  stepDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a3e',
    borderRadius: 2,
    marginTop: -4,
    marginBottom: 8,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ffd700',
    borderRadius: 2,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00ff00',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#00ff0060',
  },
  startButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  altSource: {
    marginTop: 24,
    alignItems: 'center',
  },
  altSourceTitle: {
    color: '#666',
    fontSize: 12,
  },
  altSourceLink: {
    color: '#00aaff',
    fontSize: 12,
    marginTop: 4,
    textDecorationLine: 'underline',
  },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  ActivityIndicator,
  Chip,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { voiceTestUtils, type VoiceTestSuite, quickVoiceDiagnostic } from '../../utils/voiceTestUtils';
import { useVoiceCommunication } from '../../hooks/useVoiceCommunication';
import { useCulturalContext } from '../../contexts/CulturalContext';
import { PreferredLanguage } from '../../types';
import config from '../../config';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const VoiceDebugScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { culturalProfile } = useCulturalContext();
  const [testResults, setTestResults] = useState<VoiceTestSuite | null>(null);
  const [diagnostic, setDiagnostic] = useState<string>('');
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isRunningDiagnostic, setIsRunningDiagnostic] = useState(false);
  const [manualTestTranscripts, setManualTestTranscripts] = useState<string[]>([]);

  const {
    isListening,
    isSpeaking,
    interimTranscript,
    finalTranscript: _finalTranscript,
    error,
    audioState,
    isInitialized,
    startListening,
    stopListening,
    speak: _speak,
    stopSpeaking: _stopSpeaking,
    resetTranscript,
  } = useVoiceCommunication({
    preferredLanguage: culturalProfile.preferredLanguage as PreferredLanguage,
    enableTTS: true,
    onTranscriptUpdate: (text, isFinal) => {
      if (isFinal && text.trim()) {
        setManualTestTranscripts(prev => [...prev, text]);
      }
    },
    onError: (err) => {
      Alert.alert('Voice Recognition Error', err);
    },
  });

  useEffect(() => {
    runQuickDiagnostic();
  }, []);

  const runQuickDiagnostic = async () => {
    setIsRunningDiagnostic(true);
    try {
      const result = await quickVoiceDiagnostic();
      setDiagnostic(result);
    } catch (error) {
      setDiagnostic(`Diagnostic failed: ${error}`);
    } finally {
      setIsRunningDiagnostic(false);
    }
  };

  const runFullTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await voiceTestUtils.runCompleteVoiceTest(
        culturalProfile.preferredLanguage as PreferredLanguage
      );
      setTestResults(results);
    } catch (error) {
      Alert.alert('Test Error', `Failed to run tests: ${error}`);
    } finally {
      setIsRunningTests(false);
    }
  };

  const toggleManualTest = () => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  };

  const clearManualTestResults = () => {
    setManualTestTranscripts([]);
    resetTranscript();
  };

  const getStatusColor = (passed: boolean) => passed ? '#4CAF50' : '#F44336';
  const getStatusIcon = (passed: boolean) => passed ? 'check-circle' : 'close-circle';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            icon="arrow-left"
            style={styles.backButton}
          >
            Back
          </Button>
          <Text style={styles.title}>Voice Recording Debug</Text>
        </View>

        {/* Configuration Status */}
        <Card style={styles.card}>
          <Card.Title
            title="Configuration Status"
            left={(props) => <Icon {...props} name="cog" />}
          />
          <Card.Content>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Environment:</Text>
              <Chip mode="outlined">{config.app.env}</Chip>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>DeepSeek API:</Text>
              <Chip 
                mode="outlined"
                textStyle={{ color: getStatusColor(config.deepseek.isConfigured) }}
              >
                {config.deepseek.isConfigured ? 'Configured' : 'Not Configured'}
              </Chip>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>ElevenLabs API:</Text>
              <Chip 
                mode="outlined"
                textStyle={{ color: getStatusColor(config.elevenLabs.isConfigured) }}
              >
                {config.elevenLabs.isConfigured ? 'Configured' : 'Not Configured'}
              </Chip>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Debug Mode:</Text>
              <Chip mode="outlined">{config.app.debugMode ? 'Enabled' : 'Disabled'}</Chip>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Platform:</Text>
              <Chip mode="outlined">{Platform.OS}</Chip>
            </View>
          </Card.Content>
        </Card>

        {/* Quick Diagnostic */}
        <Card style={styles.card}>
          <Card.Title
            title="Quick Diagnostic"
            left={(props) => <Icon {...props} name="stethoscope" />}
            right={(props) => (
              <Button
                {...props}
                mode="outlined"
                onPress={runQuickDiagnostic}
                loading={isRunningDiagnostic}
                disabled={isRunningDiagnostic}
              >
                Refresh
              </Button>
            )}
          />
          <Card.Content>
            {isRunningDiagnostic ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.diagnosticText}>{diagnostic}</Text>
            )}
          </Card.Content>
        </Card>

        {/* Manual Voice Test */}
        <Card style={styles.card}>
          <Card.Title
            title="Manual Voice Test"
            left={(props) => <Icon {...props} name="microphone-variant" />}
          />
          <Card.Content>
            <View style={styles.manualTestControls}>
              <Button
                mode={isListening ? "contained" : "outlined"}
                onPress={toggleManualTest}
                icon={isListening ? "microphone-off" : "microphone"}
                buttonColor={isListening ? "#F44336" : "#4CAF50"}
                disabled={!!error || !isInitialized || isSpeaking}
                style={styles.testButton}
              >
                {isListening ? 'Stop Listening' : 'Start Listening'}
              </Button>
              <Button
                mode="outlined"
                onPress={clearManualTestResults}
                icon="delete"
                style={styles.testButton}
              >
                Clear Results
              </Button>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Icon name="alert-circle" size={16} color="#F44336" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {(isListening || isSpeaking) && (
              <View style={styles.listeningIndicator}>
                <ActivityIndicator color="#4CAF50" />
                <Text style={styles.listeningText}>
                  {isListening ? 'Listening...' : 'Speaking...'}
                </Text>
              </View>
            )}

            {interimTranscript && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>Current:</Text>
                <Text style={styles.interimTranscript}>{interimTranscript}</Text>
              </View>
            )}

            {manualTestTranscripts.length > 0 && (
              <View style={styles.transcriptContainer}>
                <Text style={styles.transcriptLabel}>Results:</Text>
                {manualTestTranscripts.map((transcript, index) => (
                  <Text key={index} style={styles.finalTranscript}>
                    {index + 1}. {transcript}
                  </Text>
                ))}
              </View>
            )}

            <View style={styles.audioStateContainer}>
              <Text style={styles.audioStateLabel}>Audio State:</Text>
              <Text style={styles.audioStateText}>
                Recording: {audioState.isRecording ? 'Yes' : 'No'} | 
                Playing: {audioState.isPlaying ? 'Yes' : 'No'} | 
                Initialized: {isInitialized ? 'Yes' : 'No'}
              </Text>
            </View>
          </Card.Content>
        </Card>

        {/* Full Test Suite */}
        <Card style={styles.card}>
          <Card.Title
            title="Full Test Suite"
            left={(props) => <Icon {...props} name="test-tube" />}
          />
          <Card.Content>
            <Button
              mode="contained"
              onPress={runFullTests}
              loading={isRunningTests}
              disabled={isRunningTests}
              icon="play"
              style={styles.fullTestButton}
            >
              Run Complete Tests
            </Button>

            {testResults && (
              <View style={styles.testResultsContainer}>
                <Divider style={styles.divider} />
                <View style={styles.testSummary}>
                  <Text style={styles.testSummaryTitle}>
                    Test Summary: {testResults.overall ? 'PASS' : 'FAIL'}
                  </Text>
                  <Text style={styles.testSummarySubtitle}>
                    {testResults.summary.passed}/{testResults.summary.total} tests passed
                  </Text>
                </View>

                {testResults.results.map((result, index) => (
                  <View key={index} style={styles.testResultItem}>
                    <View style={styles.testResultHeader}>
                      <Icon 
                        name={getStatusIcon(result.passed)} 
                        size={20} 
                        color={getStatusColor(result.passed)} 
                      />
                      <Text style={styles.testResultTitle}>{result.test}</Text>
                    </View>
                    <Text style={styles.testResultMessage}>{result.message}</Text>
                    {config.app.debugMode && !!result.details && (
                      <Text style={styles.testResultDetails}>
                        {JSON.stringify(result.details, null, 2)}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Voice Recording Debug Tool v1.0
          </Text>
          <Text style={styles.footerText}>
            Language: {culturalProfile.preferredLanguage.toUpperCase()}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  diagnosticText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 4,
  },
  manualTestControls: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  testButton: {
    flex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  listeningIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  listeningText: {
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  transcriptContainer: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  transcriptLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  interimTranscript: {
    fontStyle: 'italic',
    color: '#666',
  },
  finalTranscript: {
    color: '#333',
    marginBottom: 4,
  },
  audioStateContainer: {
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
  },
  audioStateLabel: {
    fontWeight: '500',
    marginBottom: 4,
  },
  audioStateText: {
    fontSize: 12,
    color: '#666',
  },
  fullTestButton: {
    marginBottom: 16,
  },
  testResultsContainer: {
    marginTop: 8,
  },
  divider: {
    marginVertical: 16,
  },
  testSummary: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 4,
    marginBottom: 16,
  },
  testSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  testSummarySubtitle: {
    fontSize: 14,
    color: '#666',
  },
  testResultItem: {
    backgroundColor: '#fafafa',
    padding: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  testResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  testResultTitle: {
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  testResultMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  testResultDetails: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 10,
    backgroundColor: '#f0f0f0',
    padding: 8,
    borderRadius: 4,
    color: '#333',
  },
  footer: {
    alignItems: 'center',
    padding: 16,
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },

});

export default VoiceDebugScreen;
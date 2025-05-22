import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import LargeText from '../../components/ui/LargeText';
import ActivityPrompt from '../../components/ui/ActivityPrompt';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import RepeatButton from '../../components/ui/RepeatButton';
import VoiceInputIndicator from '../../components/ui/VoiceInputIndicator';
import { Button } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;

const questions = [
  { prompt: "What is today's date?", answer: '' },
  { prompt: 'What is the name of this place?', answer: '' },
  { prompt: 'Can you remember these three words: Apple, Table, Penny?', answer: '' },
  { prompt: 'What season is it?', answer: '' },
  { prompt: 'Please spell the word "WORLD" backwards.', answer: '' },
];

type CognitiveAssessmentScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CognitiveAssessment'>;

interface Props {
  navigation: CognitiveAssessmentScreenNavigationProp;
}

const CognitiveAssessmentScreen: React.FC<Props> = ({ navigation }) => {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(questions.length).fill(''));
  const [listening, setListening] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const handleVoiceInput = () => {
    setListening(true);
    // Placeholder: In real app, integrate voice-to-text here
    setTimeout(() => {
      const simulatedAnswer = 'Simulated answer';
      handleAnswer(simulatedAnswer);
      setListening(false);
    }, 2000);
  };

  const handleAnswer = (answer: string) => {
    const updated = [...answers];
    updated[current] = answer;
    setAnswers(updated);
    if (current < questions.length - 1) {
      setCurrent(current + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleRepeat = () => {
    Speech.speak(questions[current].prompt, { language: 'en' });
  };

  const handleRestart = () => {
    setCurrent(0);
    setAnswers(Array(questions.length).fill(''));
    setShowResult(false);
  };

  if (showResult) {
    return (
      <SafeAreaView style={styles.container} edges={["top","left","right"]}>
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
        <View style={styles.contentContainer}>
          <LargeText>Assessment Complete</LargeText>
          <ActivityPrompt prompt={`Thank you! Your answers have been recorded.`} />
          <Button mode="contained" onPress={handleRestart} style={styles.button}>Restart</Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
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
      <View style={styles.contentContainer}>
        <LargeText>Cognitive Assessment</LargeText>
        <ProgressIndicator visible={false} />
        <ActivityPrompt prompt={questions[current].prompt} />
        <VoiceInputIndicator active={listening} />
        <RepeatButton onPress={handleRepeat} />
        <Button mode="contained" onPress={handleVoiceInput} style={styles.button} disabled={listening}>
          Answer by Voice
        </Button>
        <Button mode="text" onPress={() => handleAnswer('Skipped')} style={styles.button} disabled={listening}>
          Skip
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  button: {
    marginTop: 16,
    width: 220,
    borderRadius: 24,
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
  },
});

export default CognitiveAssessmentScreen; 
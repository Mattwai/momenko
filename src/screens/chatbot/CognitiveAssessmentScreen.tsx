import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import LargeText from '../../components/ui/LargeText';
import ActivityPrompt from '../../components/ui/ActivityPrompt';
import ProgressIndicator from '../../components/ui/ProgressIndicator';
import RepeatButton from '../../components/ui/RepeatButton';
import VoiceInputIndicator from '../../components/ui/VoiceInputIndicator';
import { Button } from 'react-native-paper';
import * as Speech from 'expo-speech';
import { SafeAreaView } from 'react-native-safe-area-context';

declare function setTimeout(handler: (...args: unknown[]) => void, timeout?: number, ...args: unknown[]): number;

const questions = [
  { prompt: "What is today's date?", answer: '' },
  { prompt: 'What is the name of this place?', answer: '' },
  { prompt: 'Can you remember these three words: Apple, Table, Penny?', answer: '' },
  { prompt: 'What season is it?', answer: '' },
  { prompt: 'Please spell the word "WORLD" backwards.', answer: '' },
];

const CognitiveAssessmentScreen = () => {
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
        <LargeText>Assessment Complete</LargeText>
        <ActivityPrompt prompt={`Thank you! Your answers have been recorded.`} />
        <Button mode="contained" onPress={handleRestart} style={styles.button}>Restart</Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top","left","right"]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  button: {
    marginTop: 16,
    width: 220,
    borderRadius: 24,
  },
});

export default CognitiveAssessmentScreen; 
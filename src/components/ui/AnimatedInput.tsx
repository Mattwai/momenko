import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import * as Animatable from 'react-native-animatable';

interface AnimatedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export const AnimatedInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  error,
  autoCapitalize = 'none',
}: AnimatedInputProps) => {
  return (
    <Animatable.View animation="fadeInUp" duration={800} useNativeDriver>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        error={!!error}
        autoCapitalize={autoCapitalize}
        style={styles.input}
        mode="outlined"
      />
      {error && (
        <Animatable.Text
          animation="fadeIn"
          style={styles.errorText}
        >
          {error}
        </Animatable.Text>
      )}
    </Animatable.View>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: 12,
    backgroundColor: 'white',
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
  },
}); 
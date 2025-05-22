import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { signUpWithEmail } from '../../services/supabase/auth';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import * as Animatable from 'react-native-animatable';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Register'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error.message || 'Registration failed');
    } else {
      navigation.replace('Main');
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Animatable.View animation="fadeInDown" duration={1000}>
          <Text variant="displaySmall" style={styles.title}>
            Create Account
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Join us today
          </Text>
        </Animatable.View>

        <View style={styles.formContainer}>
          <AnimatedInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={error}
          />
          <AnimatedInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={error}
          />
          <AnimatedInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={error}
          />

          <Animatable.View animation="fadeInUp" delay={400}>
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
              contentStyle={styles.buttonContent}
            >
              Sign Up
            </Button>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" delay={600}>
            <Button
              mode="text"
              onPress={() => navigation.replace('Login')}
              style={styles.loginButton}
            >
              Already have an account? Sign In
            </Button>
          </Animatable.View>
        </View>
      </View>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: 'white',
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 32,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  registerButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});

export default RegisterScreen; 
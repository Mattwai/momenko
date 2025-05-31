import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { signInWithEmail } from '../../services/supabase/auth';
import { GradientBackground } from '../../components/ui/GradientBackground';
import { AnimatedInput } from '../../components/ui/AnimatedInput';
import * as Animatable from 'react-native-animatable';
import { useSupabase } from '../../contexts/SupabaseContext';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { session, isLoading } = useSupabase();

  useEffect(() => {
    if (session && !isLoading) {
      navigation.replace('Main');
    }
  }, [session, isLoading, navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const { error: signInError } = await signInWithEmail(email, password);
      
      if (signInError) {
        setError(signInError.message || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <GradientBackground>
        <View style={styles.container}>
          <Text style={styles.title}>Loading...</Text>
        </View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Animatable.View animation="fadeInDown" duration={1000}>
          <Text variant="displaySmall" style={styles.title}>
            Welcome Back
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Sign in to continue
          </Text>
        </Animatable.View>

        <View style={styles.formContainer}>
          <AnimatedInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={error}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AnimatedInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            error={error}
          />

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          <Animatable.View animation="fadeInUp" delay={400}>
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              contentStyle={styles.buttonContent}
            >
              Sign In
            </Button>
          </Animatable.View>

          <Animatable.View animation="fadeInUp" delay={600}>
            <Button
              mode="text"
              onPress={() => navigation.replace('Register')}
              style={styles.registerButton}
            >
              Don't have an account? Sign Up
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
  loginButton: {
    marginTop: 16,
    borderRadius: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  registerButton: {
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default LoginScreen; 
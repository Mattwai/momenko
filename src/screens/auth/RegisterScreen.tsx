import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../../App';
import { signUpWithEmail, resendConfirmationEmail } from '../../services/supabase/auth';

type RegisterScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    const { error } = await signUpWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error.message || 'Registration failed');
    } else {
      setSuccess('Registration successful! Please check your email to confirm your account.');
    }
  };

  return (
    <View style={styles.container}>
      <Text variant="headlineMedium">Register</Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {success ? <Text style={styles.success}>{success}</Text> : null}
      {success ? (
        <>
          <Button
            mode="outlined"
            onPress={async () => {
              setResendLoading(true);
              setResendMsg('');
              const { error } = await resendConfirmationEmail(email);
              setResendLoading(false);
              if (error) {
                setResendMsg(error.message || 'Failed to resend confirmation email.');
              } else {
                setResendMsg('Confirmation email resent! Please check your inbox.');
              }
            }}
            loading={resendLoading}
            disabled={resendLoading}
            style={{ marginTop: 8 }}
          >
            Resend confirmation email
          </Button>
          {resendMsg ? <Text style={{ color: resendMsg.startsWith('Confirmation') ? 'green' : 'red', marginTop: 4 }}>{resendMsg}</Text> : null}
        </>
      ) : null}
      <Button mode="contained" onPress={handleRegister} loading={loading} disabled={loading}>
        Register
      </Button>
      <Button onPress={() => navigation.replace('Login')} style={styles.backButton}>
        Back to Login
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 12,
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
  success: {
    color: 'green',
    marginBottom: 12,
  },
  backButton: {
    marginTop: 8,
  },
});

export default RegisterScreen; 
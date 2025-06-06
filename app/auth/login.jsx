import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, ImageBackground } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/common/Input';
import globalStyles from '../styles/globalStyles';

export default function Login() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);

  const validateForm = () => {
    if (!email || !password) {
      setError('Please complete all fields');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;
    setLoading(true);
    setError('');
    try {
      const { data, error } = await login(email, password);
      if (error) throw error;
      router.replace('/dashboard');
    } catch (error) {
      setError(error.message || 'Error signing in');
      showSnackbar(error.message || 'Error signing in');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await loginWithGoogle();
      if (error) throw error;
      router.replace('/dashboard');
    } catch (error) {
      console.error('Google Sign-In error:', error);
      setError('Error signing in with Google');
      showSnackbar('Error signing in with Google');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message) => {
    setSnackbarMessage(message);
    setSnackbarVisible(true);
  };

  return (
    <ImageBackground source={require('../assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
        {loading && (
          <View style={globalStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1976D2" />
          </View>
        )}
        <View style={globalStyles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={globalStyles.logo}
            resizeMode="contain"
          />
        </View>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            Sign In
          </Text>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={!!error}
            placeholder="Enter your email"
            style={globalStyles.input}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secureTextEntry}
            error={!!error}
            placeholder="Enter your password"
            style={globalStyles.input}
            rightIcon={secureTextEntry ? 'eye' : 'eye-off'}
            onRightIconPress={() => setSecureTextEntry(!secureTextEntry)}
          />
          {error ? (
            <Text style={globalStyles.errorText}>{error}</Text>
          ) : null}
          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={[globalStyles.button, globalStyles.primaryButton]}
            labelStyle={[globalStyles.buttonLabel, { fontWeight: '600' }]}
            contentStyle={globalStyles.buttonContent}
          >
            Sign In
          </Button>

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            disabled={loading}
            style={[globalStyles.button, globalStyles.googleButton]}
            labelStyle={[globalStyles.googleButtonLabel, { fontWeight: '600' }]}
            contentStyle={globalStyles.buttonContent}
            icon="google"
          >
            Continue with Google
          </Button>

          <TouchableOpacity
            onPress={() => router.push('/auth/register')}
            style={globalStyles.loginLink}
          >
            <Text style={globalStyles.loginLinkText}>
              Don't have an account? <Text style={globalStyles.linkText}>Sign up here</Text>
            </Text>
          </TouchableOpacity>
        </View>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={globalStyles.snackbar}
          action={{
            label: 'Dismiss',
            onPress: () => setSnackbarVisible(false),
          }}
        >
          {snackbarMessage}
        </Snackbar>
      </ScrollView>
    </ImageBackground>
  );
} 
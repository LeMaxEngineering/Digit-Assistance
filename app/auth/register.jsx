import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, ImageBackground } from 'react-native';
import { Text, Button, ActivityIndicator, Snackbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import Input from '../components/common/Input';
import globalStyles from '../styles/globalStyles';

export default function Register() {
  const router = useRouter();
  const { register, loginWithGoogle } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [confirmSecureTextEntry, setConfirmSecureTextEntry] = useState(true);

  const validateForm = () => {
    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please complete all fields');
      return false;
    }

    if (fullName.length < 2) {
      setError('Please enter a valid full name');
      return false;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await register(email, password, {
        full_name: fullName,
      });

      if (result.needsProfileCompletion) {
        // Redirect to profile completion page
        router.replace({
          pathname: '/auth/complete-profile',
          params: { userId: result.user.id }
        });
      } else {
        // Regular registration flow
        router.replace('/');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error } = await loginWithGoogle();
      if (error) throw error;
      router.replace('/dashboard');
    } catch (error) {
      console.error('Google Sign-Up error:', error);
      setError('Error signing up with Google');
      showSnackbar('Error signing up with Google');
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
          <Image source={require('../assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
        </View>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Text variant="headlineMedium" style={globalStyles.title}>
            Create Account
          </Text>

          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            error={!!error}
            placeholder="Enter your full name"
            style={globalStyles.input}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
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

          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={confirmSecureTextEntry}
            error={!!error}
            placeholder="Confirm your password"
            style={globalStyles.input}
            rightIcon={confirmSecureTextEntry ? 'eye' : 'eye-off'}
            onRightIconPress={() => setConfirmSecureTextEntry(!confirmSecureTextEntry)}
          />

          {error ? (
            <Text style={globalStyles.errorText}>{error}</Text>
          ) : null}

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={[globalStyles.button, globalStyles.primaryButton]}
            labelStyle={[globalStyles.buttonLabel, { fontWeight: '600' }]}
            contentStyle={globalStyles.buttonContent}
          >
            Create Account
          </Button>

          <Button
            mode="outlined"
            onPress={handleGoogleSignUp}
            disabled={loading}
            style={[globalStyles.button, globalStyles.googleButton]}
            labelStyle={[globalStyles.googleButtonLabel, { fontWeight: '600' }]}
            contentStyle={globalStyles.buttonContent}
            icon="google"
          >
            Continue with Google
          </Button>

          <TouchableOpacity
            onPress={() => router.push('/auth/login')}
            style={globalStyles.loginLink}
          >
            <Text style={globalStyles.loginLinkText}>
              Already have an account? <Text style={globalStyles.linkText}>Sign in here</Text>
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
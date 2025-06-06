import React, { useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import globalStyles from '../styles/globalStyles';

const BACKGROUND_IMAGE = require('../assets/images/splash01.png');

export default function Splash() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    }, 5000); // Show splash for 5 seconds

    return () => clearTimeout(timer);
  }, [user]);

  const handleLogin = () => router.replace('/auth/login');
  const handleSignup = () => router.replace('/auth/register');

  const resendConfirmationEmail = async () => {
    try {
      await supabase.auth.resend({
        type: 'signup',
        email: 'carlox.go@gmail.com'
      });
      console.log('Confirmation email sent successfully');
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  };

  return (
    <ImageBackground source={BACKGROUND_IMAGE} style={globalStyles.splashBackground} resizeMode="cover">
      <View style={globalStyles.splashOverlay} />
      <View style={globalStyles.splashHeader}>
        <Image source={require('../assets/images/logo.png')} style={globalStyles.splashLogo} resizeMode="contain" />
        <Text style={globalStyles.splashWelcome}>Welcome to Digital Assistance</Text>
      </View>
      <View style={globalStyles.splashCenterContent}>
        <Text style={globalStyles.splashHeadline}>SCAN YOUR ASSISTANCE SHEETS AND GET THE INFORMATION YOU NEED</Text>
      </View>
    </ImageBackground>
  );
} 
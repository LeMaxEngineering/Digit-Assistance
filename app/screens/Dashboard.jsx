import React, { useState } from 'react';
import { View, TouchableOpacity, Image, ScrollView, ImageBackground } from 'react-native';
import { Text, Button, Avatar, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import globalStyles from '../styles/globalStyles';

export default function Dashboard() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    setSnackbarVisible(true);
    setTimeout(() => {
      router.replace('/auth/login');
    }, 1200);
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
        <View style={globalStyles.content}>
          <Avatar.Text
            size={64}
            label={user?.displayName ? user.displayName[0] : (user?.email ? user.email[0] : '?')}
            style={{ backgroundColor: '#1976D2', alignSelf: 'center' }}
          />
          <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: 'bold', textAlign: 'center' }}>
            {user?.displayName || user?.email}
          </Text>
          <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 8, textAlign: 'center' }}>
            {user?.email}
          </Text>
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 8, alignSelf: 'center' }} disabled={loading}>
            <Text style={{ color: '#B00020', fontWeight: 'bold' }}>Log out</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 32 }}>
            <TouchableOpacity style={{ backgroundColor: '#f5f7fa', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', flex: 1, marginHorizontal: 8, elevation: 2 }} onPress={() => router.push('/document/new')}>
              <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 18 }}>New Document</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f5f7fa', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 28, alignItems: 'center', flex: 1, marginHorizontal: 8, elevation: 2 }} onPress={() => router.push('/document/history')}>
              <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 18 }}>Created Document</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={1200}
          style={{ backgroundColor: '#1976D2' }}
        >
          Logged out
        </Snackbar>
      </ScrollView>
    </ImageBackground>
  );
} 
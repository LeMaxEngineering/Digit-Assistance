import React, { useEffect, useState } from 'react';
import { View, Image, ScrollView, ImageBackground, TouchableOpacity } from 'react-native';
import { Text, Button, Avatar, Snackbar, ActivityIndicator } from 'react-native-paper';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from './config/supabase';
import globalStyles from './styles/globalStyles';
import ProfileCompletionForm from './components/ProfileCompletionForm';

export default function DashboardScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [profile, setProfile] = useState(null);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('Fetching profile for user:', user?.id);
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*, companies(name)')
          .eq('id', user.id)
          .single();
        
        console.log('Profile fetch result:', { data, error });
        
        if (error) {
          console.log('Error fetching profile:', error.message);
          // If profile doesn't exist, we should show the completion form
          if (error.code === 'PGRST116') {
            setNeedsProfileCompletion(true);
            return;
          }
        }

        if (data) {
          console.log('Setting profile data:', data);
          setProfile(data);
          // Check if profile needs completion
          const needsCompletion = !data.full_name || !data.company_id;
          console.log('Profile needs completion:', needsCompletion);
          setNeedsProfileCompletion(needsCompletion);
        } else {
          // If no data returned, show completion form
          console.log('No profile data found, showing completion form');
          setNeedsProfileCompletion(true);
        }
      }
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    setLoading(false);
    setSnackbarVisible(true);
    setTimeout(() => {
      router.replace('/auth/login');
    }, 1200);
  };

  const handleProfileComplete = async () => {
    console.log('Profile completion handler called');
    // Refresh profile data
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(name)')
      .eq('id', user.id)
      .single();
    
    console.log('Profile refresh result:', { data, error });
    
    if (!error && data) {
      setProfile(data);
      setNeedsProfileCompletion(false);
    }
  };

  console.log('Current state:', { 
    hasUser: !!user, 
    hasProfile: !!profile, 
    needsProfileCompletion 
  });

  if (needsProfileCompletion) {
    console.log('Rendering profile completion form');
    return (
      <ImageBackground source={require('./assets/images/splash01.png')} style={globalStyles.backgroundImage}>
        <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1 }}>
          <View style={globalStyles.logoContainer}>
            <Image source={require('./assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
          </View>
          <View style={[globalStyles.content, globalStyles.formBox]}>
            <Text variant="titleLarge" style={{ marginBottom: 24, textAlign: 'center', color: '#1976D2' }}>
              Complete Your Profile
            </Text>
            <ProfileCompletionForm
              userId={user.id}
              onComplete={handleProfileComplete}
            />
          </View>
        </ScrollView>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground source={require('./assets/images/splash01.png')} style={globalStyles.backgroundImage}>
      <ScrollView style={globalStyles.container} contentContainerStyle={{ flexGrow: 1, paddingBottom: 60 }}>
        {loading && (
          <View style={globalStyles.loadingOverlay}>
            <ActivityIndicator size="large" color="#1976D2" />
          </View>
        )}
        <View style={globalStyles.logoContainer}>
          <Image source={require('./assets/images/logo.png')} style={globalStyles.logo} resizeMode="contain" />
        </View>
        <View style={[globalStyles.content, globalStyles.formBox]}>
          <Avatar.Text
            size={64}
            label={profile?.full_name ? profile.full_name[0] : (user?.email ? user.email[0] : '?')}
            style={{ backgroundColor: '#1976D2', alignSelf: 'center' }}
          />
          <Text variant="titleLarge" style={{ marginTop: 16, fontWeight: 'bold', textAlign: 'center', color: '#1976D2' }}>
            {profile?.full_name || user?.email}
          </Text>
          <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 8, textAlign: 'center' }}>
            {user?.email}
          </Text>
          {profile?.companies?.name && (
            <Text variant="bodyMedium" style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
              {profile.companies.name}
            </Text>
          )}
          <TouchableOpacity onPress={handleLogout} style={{ marginTop: 8, alignSelf: 'center' }} disabled={loading}>
            <Text style={{ color: '#B00020', fontWeight: 'bold' }}>Log out</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', marginTop: 32 }}>
            <TouchableOpacity style={{ backgroundColor: '#f5f7fa', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18, alignItems: 'center', flex: 1, marginHorizontal: 8, elevation: 2 }} onPress={() => router.push('/document/new')}>
              <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 15 }}>New Document</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#f5f7fa', borderRadius: 20, paddingVertical: 20, paddingHorizontal: 18, alignItems: 'center', flex: 1, marginHorizontal: 8, elevation: 2 }} onPress={() => router.push('/document/history')}>
              <Text style={{ color: '#1976D2', fontWeight: 'bold', fontSize: 15 }}>Document History</Text>
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
        <View style={{ alignItems: 'center', marginTop: 24, marginBottom: 8 }}>
          <Text style={{ fontSize: 12, color: '#1976D2', textAlign: 'center' }}>
            Digital Assistance v0.1Beta. Developed by LeMax Engineering LLC, USA. +1 561 506 9714
          </Text>
        </View>
      </ScrollView>
    </ImageBackground>
  );
} 
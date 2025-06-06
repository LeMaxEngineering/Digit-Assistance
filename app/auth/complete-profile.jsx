import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import ProfileCompletionForm from '../components/ProfileCompletionForm';
import { useAuth } from '../contexts/AuthContext';

export default function CompleteProfile() {
  const { userId } = useLocalSearchParams();
  const { user } = useAuth();

  // If no userId is provided, use the current user's ID
  const profileUserId = userId || user?.id;

  if (!profileUserId) {
    return null; // or show an error message
  }

  return (
    <View style={styles.container}>
      <ProfileCompletionForm
        userId={profileUserId}
        onComplete={() => {
          // This will be called when the profile is completed
          console.log('Profile completed successfully');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
}); 
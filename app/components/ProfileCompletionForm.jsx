import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../config/supabase';
import { useRouter } from 'expo-router';

export default function ProfileCompletionForm({ userId, onComplete }) {
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name');

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to load companies. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!company) {
      setError('Please select a company');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // First, check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();

      let result;
      if (checkError && checkError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating new profile for user:', userId);
        result = await supabase
          .from('profiles')
          .insert({
            id: userId,
            user_id: userId,
            full_name: fullName.trim(),
            company_id: company,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
      } else {
        // Profile exists, update it
        console.log('Updating existing profile for user:', userId);
        result = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            company_id: company,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving profile:', result.error);
        throw result.error;
      }

      console.log('Profile saved successfully:', result.data);

      // Call the onComplete callback
      onComplete();
      
      // Redirect to the main app
      router.replace('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Complete Your Profile</Text>
      <Text style={styles.subtitle}>Please provide your information to continue</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="Enter your full name"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Company</Text>
        <View style={styles.companyContainer}>
          {companies.map((comp) => (
            <TouchableOpacity
              key={comp.id}
              style={[
                styles.companyButton,
                company === comp.id && styles.companyButtonSelected,
              ]}
              onPress={() => setCompany(comp.id)}
            >
              <Text
                style={[
                  styles.companyButtonText,
                  company === comp.id && styles.companyButtonTextSelected,
                ]}
              >
                {comp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Profile</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  companyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  companyButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  companyButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  companyButtonText: {
    color: '#333',
  },
  companyButtonTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ff3b30',
    marginBottom: 16,
    textAlign: 'center',
  },
}); 
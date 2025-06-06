import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000/api';

export default function TestPage() {
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  useEffect(() => {
    checkServerStatus();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/test`);
      const data = await response.json();
      setServerStatus(data.message || 'Server is running');
      setEmailConfigured(data.emailConfigured || false);
      if (data.error) {
        setErrorDetails(data.error);
      }
    } catch (error) {
      console.error('Server check error:', error);
      setServerStatus('Server is not responding');
      setErrorDetails(error.message);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    setLoading(true);
    setErrorDetails(null);
    try {
      const response = await fetch(`${API_URL}/send-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test Email',
          text: 'This is a test email from the Digital Assistant app.',
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        Alert.alert('Success', 'Test email sent successfully!');
      } else {
        throw new Error(data.error || 'Failed to send email');
      }
    } catch (error) {
      console.error('Test email error:', error);
      setErrorDetails(error.message);
      Alert.alert('Error', error.message || 'Failed to send test email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Email Server Test</Text>
      
      <View style={styles.statusContainer}>
        <Text style={styles.label}>Server Status:</Text>
        <Text style={[
          styles.status,
          serverStatus === 'Server is running' ? styles.statusSuccess : styles.statusError
        ]}>
          {serverStatus}
        </Text>
        
        <Text style={styles.label}>Email Configuration:</Text>
        <Text style={[
          styles.status,
          emailConfigured ? styles.statusSuccess : styles.statusError
        ]}>
          {emailConfigured ? 'Configured' : 'Not Configured'}
        </Text>

        {errorDetails && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorLabel}>Error Details:</Text>
            <Text style={styles.errorText}>{errorDetails}</Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Test Email Address:</Text>
        <TextInput
          style={styles.input}
          value={testEmail}
          onChangeText={setTestEmail}
          placeholder="Enter email address"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleTestEmail}
        disabled={loading || !emailConfigured}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Send Test Email'}
        </Text>
      </TouchableOpacity>

      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Configuration Instructions:</Text>
        <Text style={styles.infoText}>1. Create a .env file in the server directory</Text>
        <Text style={styles.infoText}>2. Add your Gmail credentials:</Text>
        <Text style={styles.infoCode}>EMAIL_USER=carlox.go@gmail.com</Text>
        <Text style={styles.infoCode}>EMAIL_PASSWORD=kgcfbjgubyjayib</Text>
        <Text style={styles.infoText}>3. Restart the server</Text>
      </View>
    </ScrollView>
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
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  statusSuccess: {
    color: '#4CAF50',
  },
  statusError: {
    color: '#F44336',
  },
  errorContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 4,
  },
  errorLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#333',
  },
  infoCode: {
    fontSize: 14,
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
}); 
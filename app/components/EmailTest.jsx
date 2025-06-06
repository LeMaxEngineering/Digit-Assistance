import React, { useState } from 'react';
import { View, Text, Button, TextInput } from 'react-native-paper';
import { testEmailConfig } from '../services/emailService';

export default function EmailTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleTest = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const success = await testEmailConfig();
      setResult('Email configuration test successful! Check your inbox.');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20 }}>
        Test Email Configuration
      </Text>

      <Button
        mode="contained"
        onPress={handleTest}
        loading={loading}
        disabled={loading}
        style={{ marginBottom: 20 }}
      >
        Test Email Configuration
      </Button>

      {result && (
        <Text style={{ color: 'green', marginBottom: 10 }}>
          {result}
        </Text>
      )}

      {error && (
        <Text style={{ color: 'red', marginBottom: 10 }}>
          Error: {error}
        </Text>
      )}

      <Text style={{ marginTop: 20, fontSize: 14, color: '#666' }}>
        This will send a test email to verify your email configuration is working correctly.
        Make sure you have set up your .env file with EMAIL_USER and EMAIL_PASSWORD.
      </Text>
    </View>
  );
} 
import React from 'react';
import { TextInput } from 'react-native-paper';
import { StyleSheet } from 'react-native';

export default function Input({ 
  label, 
  value, 
  onChangeText, 
  secureTextEntry, 
  error, 
  ...props 
}) {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secureTextEntry}
      error={error}
      mode="outlined"
      style={styles.input}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
}); 
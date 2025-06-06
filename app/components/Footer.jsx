import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import colors from '../styles/colors';

export default function Footer() {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Digital Assistance v0.1Beta. Developed by LeMax Engineering LLC, USA. +1 561 506 9714
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopWidth: 1,
    borderTopColor: colors.primary,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: colors.primary,
    fontSize: 12,
    textAlign: 'center',
  },
}); 
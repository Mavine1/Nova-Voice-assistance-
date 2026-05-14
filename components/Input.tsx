import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { Colors } from '@/constants/Colors';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export default function Input({ label, error, ...props }: InputProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : undefined,
        ]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: verticalScale(18),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '600',
    color: Colors.text,
    marginBottom: verticalScale(8),
    letterSpacing: 0.3,
  },
  input: {
    width: '100%',
    height: verticalScale(56),
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: scale(14),
    paddingHorizontal: scale(18),
    fontSize: scale(16),
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
    borderWidth: 2,
  },
  error: {
    fontSize: scale(13),
    color: Colors.error,
    marginTop: verticalScale(6),
    fontWeight: '500',
  },
});
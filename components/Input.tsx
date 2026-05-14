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
          error && styles.inputError,
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
    marginBottom: verticalScale(16),
  },
  label: {
    fontSize: scale(14),
    fontWeight: '500',
    color: Colors.text,
    marginBottom: verticalScale(8),
  },
  input: {
    width: '100%',
    height: verticalScale(52),
    backgroundColor: Colors.background,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    fontSize: scale(16),
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  error: {
    fontSize: scale(12),
    color: Colors.error,
    marginTop: verticalScale(4),
  },
});
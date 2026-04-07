import React from 'react'
import { View, Text, TextInput as RNTextInput, StyleSheet, TextInputProps as RNTextInputProps } from 'react-native'

interface TextInputProps extends RNTextInputProps {
  label?: string
  error?: boolean
  errorMessage?: string
}

const TextInput = ({ label, error, errorMessage, style, ...props }: TextInputProps) => (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <RNTextInput
      style={[styles.input, error && styles.inputError, style]}
      placeholderTextColor="#999"
      {...props}
    />
    {error && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
  </View>
)

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
})

export default TextInput

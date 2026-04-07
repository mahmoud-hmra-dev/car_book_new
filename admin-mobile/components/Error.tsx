import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

interface ErrorProps {
  message?: string
}

const Error = ({ message }: ErrorProps) => (
  <View style={styles.container}>
    <Text style={styles.text}>{message || 'An error occurred.'}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  text: {
    color: '#EF4444',
    fontSize: 14,
  },
})

export default Error

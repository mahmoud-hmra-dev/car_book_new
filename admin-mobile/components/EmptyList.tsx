import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface EmptyListProps {
  message: string
  icon?: keyof typeof MaterialIcons.glyphMap
}

const EmptyList = ({ message, icon = 'inbox' }: EmptyListProps) => (
  <View style={styles.container}>
    <MaterialIcons name={icon} size={48} color="#ccc" />
    <Text style={styles.text}>{message}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  text: {
    color: '#999',
    fontSize: 15,
    marginTop: 12,
    textAlign: 'center',
  },
})

export default EmptyList

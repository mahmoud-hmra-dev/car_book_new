import React from 'react'
import { View, Text, StyleSheet, Switch as RNSwitch } from 'react-native'

interface SwitchProps {
  label: string
  value: boolean
  onValueChange: (value: boolean) => void
}

const Switch = ({ label, value, onValueChange }: SwitchProps) => (
  <View style={styles.container}>
    <Text style={styles.label}>{label}</Text>
    <RNSwitch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: '#ddd', true: '#c4b0f0' }}
      thumbColor={value ? '#6B3CE6' : '#f4f3f4'}
    />
  </View>
)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  label: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
})

export default Switch

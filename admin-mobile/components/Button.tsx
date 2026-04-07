import React from 'react'
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native'

interface ButtonProps {
  label: string
  onPress?: () => void
  size?: 'small' | 'medium'
  variant?: 'primary' | 'secondary' | 'danger'
  style?: ViewStyle
  labelStyle?: TextStyle
  disabled?: boolean
}

const Button = ({ label, onPress, size = 'medium', variant = 'primary', style, labelStyle, disabled }: ButtonProps) => {
  const bgColor = variant === 'primary' ? '#6B3CE6'
    : variant === 'danger' ? '#EF4444'
    : '#fff'

  const textColor = variant === 'secondary' ? '#6B3CE6' : '#fff'
  const borderColor = variant === 'secondary' ? '#6B3CE6' : 'transparent'

  return (
    <Pressable
      style={[
        styles.button,
        size === 'small' && styles.small,
        { backgroundColor: bgColor, borderColor, opacity: disabled ? 0.5 : 1 },
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.label, { color: textColor }, size === 'small' && styles.smallLabel, labelStyle]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  small: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 13,
  },
})

export default Button

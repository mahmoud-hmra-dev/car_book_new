import React from 'react'
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native'
import i18n from '@/lang/i18n'

interface BackdropProps {
  message?: string
}

const Backdrop = ({ message }: BackdropProps) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#6B3CE6" />
    <Text style={styles.text}>{message || i18n.t('PLEASE_WAIT')}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  text: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
  },
})

export default Backdrop

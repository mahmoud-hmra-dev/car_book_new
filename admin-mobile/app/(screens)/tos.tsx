import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import i18n from '@/lang/i18n'
import Header from '@/components/Header'

const ToS = () => (
  <View style={styles.container}>
    <Header title={i18n.t('TOS_MENU')} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{i18n.t('TOS_MENU')}</Text>
        <Text style={styles.text}>
          Terms of Service content goes here. This is a placeholder for the actual terms of service text for the BookCars admin platform.
        </Text>
      </View>
    </ScrollView>
  </View>
)

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#333', marginBottom: 16 },
  text: { fontSize: 14, color: '#666', lineHeight: 22 },
})

export default ToS

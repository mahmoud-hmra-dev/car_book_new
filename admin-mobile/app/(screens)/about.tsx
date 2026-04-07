import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import i18n from '@/lang/i18n'
import Header from '@/components/Header'

const About = () => (
  <View style={styles.container}>
    <Header title={i18n.t('ABOUT')} />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>{i18n.t('BOOKCARS')}</Text>
        <Text style={styles.subtitle}>Admin Panel</Text>
        <Text style={styles.version}>Version 1.0.0</Text>
        <Text style={styles.description}>
          BookCars is a car rental platform for managing suppliers, cars, bookings, users, and locations.
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
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '700', color: '#6B3CE6', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#666', marginBottom: 8 },
  version: { fontSize: 13, color: '#999', marginBottom: 16 },
  description: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 22 },
})

export default About

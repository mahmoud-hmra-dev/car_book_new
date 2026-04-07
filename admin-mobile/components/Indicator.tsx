import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'

const Indicator = () => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color="#6B3CE6" />
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})

export default Indicator

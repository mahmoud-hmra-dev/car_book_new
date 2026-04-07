import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface BookingStatusProps {
  status: bookcarsTypes.BookingStatus
}

const BookingStatus = ({ status }: BookingStatusProps) => {
  const color = helper.getBookingStatusColor(status)
  const label = helper.getBookingStatus(status)

  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
})

export default BookingStatus

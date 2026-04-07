import React from 'react'
import { View, TextInput, StyleSheet, Pressable } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import i18n from '@/lang/i18n'

interface SearchProps {
  value: string
  onChangeText: (text: string) => void
  onClear?: () => void
  placeholder?: string
}

const Search = ({ value, onChangeText, onClear, placeholder }: SearchProps) => (
  <View style={styles.container}>
    <MaterialIcons name="search" size={20} color="#999" style={styles.icon} />
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder || i18n.t('SEARCH_PLACEHOLDER')}
      placeholderTextColor="#999"
    />
    {value.length > 0 && (
      <Pressable onPress={onClear}>
        <MaterialIcons name="close" size={20} color="#999" />
      </Pressable>
    )}
  </View>
)

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
})

export default Search

import AsyncStorage from '@react-native-async-storage/async-storage'
import * as toastHelper from './toastHelper'

export const storeString = async (key: string, value: string) => {
  try {
    await AsyncStorage.setItem(key, value)
  } catch (err) {
    toastHelper.error(err)
  }
}

export const getString = async (key: string) => {
  try {
    const value = await AsyncStorage.getItem(key)
    return value
  } catch (err) {
    toastHelper.error(err)
    return ''
  }
}

export const storeObject = async<T>(key: string, value: T) => {
  try {
    const jsonValue = JSON.stringify(value)
    await AsyncStorage.setItem(key, jsonValue)
  } catch (err) {
    toastHelper.error(err)
  }
}

export const getObject = async<T>(key: string) => {
  try {
    const value = await AsyncStorage.getItem(key)
    const jsonValue = value != null ? JSON.parse(value) as T : null
    return jsonValue
  } catch (err) {
    toastHelper.error(err)
    return null
  }
}

export const removeItem = async (key: string) => {
  try {
    await AsyncStorage.removeItem(key)
  } catch (err) {
    toastHelper.error(err)
  }
}

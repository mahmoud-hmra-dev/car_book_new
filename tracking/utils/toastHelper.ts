import Toast from 'react-native-toast-message'

export const success = (msg?: string) => {
  Toast.show({
    type: 'success',
    text1: msg || 'Success',
  })
}

export const error = (err?: unknown, fallback?: string) => {
  const msg = err instanceof Error ? err.message : (typeof err === 'string' ? err : fallback || 'An error occurred')
  Toast.show({
    type: 'error',
    text1: msg,
  })
}

export const info = (msg: string) => {
  Toast.show({
    type: 'info',
    text1: msg,
  })
}

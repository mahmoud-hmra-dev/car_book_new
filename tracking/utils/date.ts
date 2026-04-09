import { format, subHours, parseISO } from 'date-fns'

export const formatDate = (date?: Date | string): string => {
  if (!date) return '--'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM dd, yyyy')
  } catch {
    return '--'
  }
}

export const formatTime = (date?: Date | string): string => {
  if (!date) return '--'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'HH:mm:ss')
  } catch {
    return '--'
  }
}

export const formatDateTime = (date?: Date | string): string => {
  if (!date) return '--'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    return format(d, 'MMM dd, yyyy HH:mm')
  } catch {
    return '--'
  }
}

export const getDefaultDateRange = () => {
  const to = new Date()
  const from = subHours(to, 24)
  return { from: from.toISOString(), to: to.toISOString() }
}

export const toISOString = (date: Date): string => date.toISOString()

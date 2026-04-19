/** Returns tomorrow's date at the same time */
export const getDefaultPickupDate = (): Date => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d
}

/** Returns the day after a given date */
export const getDefaultReturnDate = (from: Date): Date => {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  return d
}

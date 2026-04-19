/**
 * Sanitize a string by trimming surrounding whitespace and
 * stripping null bytes (which can be used to truncate strings
 * in downstream C-based libraries or database drivers).
 *
 * @param {string} s
 * @returns {string}
 */
export const sanitizeString = (s: string): string => {
  if (typeof s !== 'string') {
    return ''
  }
  return s.replace(/\0/g, '').trim()
}

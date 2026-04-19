import twilio, { Twilio } from 'twilio'
import * as env from '../config/env.config'
import * as logger from './logger'

/**
 * Twilio Account SID, loaded from the environment.
 */
const TWILIO_ACCOUNT_SID = env.__env__('BC_TWILIO_ACCOUNT_SID', false, '')

/**
 * Twilio Auth Token, loaded from the environment.
 */
const TWILIO_AUTH_TOKEN = env.__env__('BC_TWILIO_AUTH_TOKEN', false, '')

/**
 * Twilio sender phone number (E.164 format, e.g. +1234567890).
 */
const TWILIO_FROM_NUMBER = env.__env__('BC_TWILIO_FROM_NUMBER', false, '')

/**
 * Cached Twilio client instance.
 */
let twilioClient: Twilio | null = null

/**
 * Indicates whether a warning has already been logged about missing config,
 * so we don't spam the logs on every call.
 */
let missingConfigWarned = false

/**
 * Returns true when all required Twilio env vars are present.
 *
 * @returns {boolean}
 */
const isConfigured = (): boolean => Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER)

/**
 * Lazily initialize the Twilio client so misconfigured environments don't crash
 * at import time.
 *
 * @returns {Twilio | null}
 */
const getClient = (): Twilio | null => {
  if (!isConfigured()) {
    if (!missingConfigWarned) {
      logger.warn('[smsService] Twilio is not configured (BC_TWILIO_ACCOUNT_SID / BC_TWILIO_AUTH_TOKEN / BC_TWILIO_FROM_NUMBER). SMS sending is disabled.')
      missingConfigWarned = true
    }
    return null
  }

  if (!twilioClient) {
    try {
      twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    } catch (err) {
      logger.error('[smsService] Failed to initialize Twilio client', err)
      return null
    }
  }

  return twilioClient
}

/**
 * Send an SMS message via Twilio.
 *
 * Fails safely: if Twilio is not configured or the API call fails, returns
 * false without throwing so the caller (webhook handler, controller, etc.)
 * can continue without crashing the server.
 *
 * @param {string} to - Destination phone number in E.164 format (e.g. +1234567890).
 * @param {string} message - SMS body.
 * @returns {Promise<boolean>} true on success, false otherwise.
 */
export const sendSms = async (to: string, message: string): Promise<boolean> => {
  if (!to || !message) {
    logger.warn('[smsService] sendSms called with empty "to" or "message"')
    return false
  }

  const client = getClient()
  if (!client) {
    return false
  }

  try {
    const result = await client.messages.create({
      from: TWILIO_FROM_NUMBER,
      to,
      body: message,
    })

    logger.info(`[smsService] SMS sent to ${to} (sid=${result.sid}, status=${result.status})`)
    return true
  } catch (err) {
    logger.error(`[smsService] Failed to send SMS to ${to}`, err)
    return false
  }
}

export default { sendSms }

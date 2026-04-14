import axios from 'axios'
import * as env from '../config/env.config'
import * as logger from '../utils/logger'

/**
 * Send a plain text message to a Telegram chat using the BookCars bot.
 *
 * This helper never throws: Telegram delivery failures should not break
 * the calling request path (notifications, tests, alerts, ...).
 *
 * @param {string} chatId
 * @param {string} message
 * @returns {Promise<void>}
 */
export const sendTelegramMessage = async (chatId: string, message: string): Promise<void> => {
  const token = env.TELEGRAM_BOT_TOKEN

  if (!token) {
    logger.error('[telegram.sendTelegramMessage] Missing BC_TELEGRAM_BOT_TOKEN')
    return
  }

  if (!chatId) {
    logger.error('[telegram.sendTelegramMessage] Missing chatId')
    return
  }

  try {
    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      },
      {
        timeout: 10000,
      },
    )
  } catch (err) {
    logger.error('[telegram.sendTelegramMessage] Error', err)
  }
}

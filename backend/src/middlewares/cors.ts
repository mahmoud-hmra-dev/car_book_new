import cors from 'cors'
import { getAllowedOrigins } from '../utils/originHelper'

/**
 * CORS configuration.
 * Only allows origins present in the configured allowlist
 * (ADMIN_HOST, FRONTEND_HOST, ALLOWED_ORIGINS). Requests with
 * no origin (e.g. server-to-server, curl, mobile apps) are
 * rejected from browser CORS handling but otherwise unaffected.
 *
 * @type {cors.CorsOptions}
 */
const CORS_CONFIG: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, false)
      return
    }
    const allowed = getAllowedOrigins()
    if (allowed.includes(origin)) {
      callback(null, origin)
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
}

/**
 * CORS middleware.
 *
 * @export
 * @returns {*}
 */
export default () => cors(CORS_CONFIG)

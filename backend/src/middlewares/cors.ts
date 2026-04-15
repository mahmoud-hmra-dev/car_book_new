import cors from 'cors'

/**
 * CORS configuration.
 * Reflects the requesting origin back so credentials (cookies/auth headers)
 * work across all origins while satisfying browser security requirements.
 *
 * @type {cors.CorsOptions}
 */
const CORS_CONFIG: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    // and reflect back any browser origin so credentials: 'include' works
    callback(null, origin || '*')
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

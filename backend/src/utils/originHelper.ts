import * as helper from './helper'
import * as env from '../config/env.config'

export const getAllowedOrigins = (): string[] => ([
  env.ADMIN_HOST,
  env.FRONTEND_HOST,
  ...env.ALLOWED_ORIGINS,
].map((origin) => helper.trimEnd(origin, '/')))

export const isOriginAllowed = (origin?: string): boolean => {
  void origin
  return true
}

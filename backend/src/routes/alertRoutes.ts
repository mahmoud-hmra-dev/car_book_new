import type { Request, Response, NextFunction } from 'express'
import express from 'express'
import * as env from '../config/env.config'
import authJwt from '../middlewares/authJwt'
import * as alertController from '../controllers/alertController'
import * as traccarWebhookController from '../controllers/traccarWebhookController'
import * as logger from '../utils/logger'

const routes = express.Router()

/**
 * Traccar webhook secret, compared against the `X-Traccar-Secret` header.
 * If unset we refuse every webhook request so an accidentally-exposed endpoint
 * can't be abused.
 */
const TRACCAR_WEBHOOK_SECRET = env.__env__('BC_TRACCAR_WEBHOOK_SECRET', false, '')

/**
 * Middleware that validates the shared Traccar webhook secret. The header name
 * is `X-Traccar-Secret` (case-insensitive per HTTP).
 */
const verifyTraccarSecret = (req: Request, res: Response, next: NextFunction) => {
  if (!TRACCAR_WEBHOOK_SECRET) {
    logger.warn('[alertRoutes] BC_TRACCAR_WEBHOOK_SECRET is not configured; rejecting Traccar webhook request')
    res.status(503).json({ error: 'Traccar webhook secret not configured' })
    return
  }

  const provided = req.header('X-Traccar-Secret')
  if (!provided || provided !== TRACCAR_WEBHOOK_SECRET) {
    res.status(401).json({ error: 'Invalid or missing X-Traccar-Secret' })
    return
  }

  next()
}

// Authenticated CRUD on user alert rules
routes.route('/api/alerts/rules')
  .get(authJwt.verifyToken, alertController.getRules)
  .post(authJwt.verifyToken, alertController.createRule)

routes.route('/api/alerts/rules/:id')
  .put(authJwt.verifyToken, alertController.updateRule)
  .delete(authJwt.verifyToken, alertController.deleteRule)

// Traccar webhook (no user auth; shared-secret header instead)
routes.route('/api/alerts/webhook/traccar')
  .post(verifyTraccarSecret, traccarWebhookController.handleTraccarEvent)

export default routes

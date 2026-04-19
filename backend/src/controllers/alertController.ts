import mongoose from 'mongoose'
import { Request, Response } from 'express'
import i18n from '../lang/i18n'
import * as logger from '../utils/logger'
import * as helper from '../utils/helper'
import AlertRule, { ALERT_RULE_TYPES, AlertRuleType } from '../models/AlertRule'

/**
 * Shape of the body accepted on create/update.
 */
interface AlertRuleBody {
  vehicleId?: string
  type?: AlertRuleType
  phoneNumber?: string
  enabled?: boolean
  threshold?: number
}

/**
 * Validate and normalize the incoming rule body. Throws on invalid input.
 */
const sanitizeRuleBody = (body: AlertRuleBody, partial = false) => {
  const out: Partial<AlertRuleBody> = {}

  if (body.vehicleId !== undefined) {
    const v = String(body.vehicleId).trim()
    if (!v) {
      throw new Error('vehicleId is required')
    }
    out.vehicleId = v
  } else if (!partial) {
    throw new Error('vehicleId is required')
  }

  if (body.type !== undefined) {
    if (!ALERT_RULE_TYPES.includes(body.type)) {
      throw new Error(`type must be one of: ${ALERT_RULE_TYPES.join(', ')}`)
    }
    out.type = body.type
  } else if (!partial) {
    throw new Error('type is required')
  }

  if (body.phoneNumber !== undefined) {
    const p = String(body.phoneNumber).trim()
    if (!p) {
      throw new Error('phoneNumber is required')
    }
    out.phoneNumber = p
  } else if (!partial) {
    throw new Error('phoneNumber is required')
  }

  if (body.enabled !== undefined) {
    out.enabled = Boolean(body.enabled)
  }

  if (body.threshold !== undefined && body.threshold !== null) {
    const n = Number(body.threshold)
    if (Number.isNaN(n)) {
      throw new Error('threshold must be a number')
    }
    out.threshold = n
  }

  return out
}

/**
 * GET /api/alerts/rules — list the authenticated user's alert rules.
 */
export const getRules = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const rules = await AlertRule
      .find({ userId: new mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean()

    res.json(rules)
  } catch (err) {
    logger.error(`[alert.getRules] ${i18n.t('ERROR')}`, err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

/**
 * POST /api/alerts/rules — create a new alert rule for the authenticated user.
 */
export const createRule = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    const payload = sanitizeRuleBody(req.body ?? {})

    const rule = new AlertRule({
      userId: new mongoose.Types.ObjectId(userId),
      vehicleId: payload.vehicleId,
      type: payload.type,
      phoneNumber: payload.phoneNumber,
      enabled: payload.enabled ?? true,
      threshold: payload.threshold,
    })

    await rule.save()
    res.status(201).json(rule)
  } catch (err) {
    logger.error(`[alert.createRule] ${i18n.t('ERROR')}`, err)
    const message = err instanceof Error ? err.message : i18n.t('ERROR')
    res.status(400).json({ error: message })
  }
}

/**
 * PUT /api/alerts/rules/:id — update an alert rule owned by the authenticated user.
 */
export const updateRule = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const userId = req.user?._id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!helper.isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid rule id' })
      return
    }

    const rule = await AlertRule.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (!rule) {
      res.status(404).json({ error: 'Rule not found' })
      return
    }

    const payload = sanitizeRuleBody(req.body ?? {}, true)

    if (payload.vehicleId !== undefined) {
      rule.vehicleId = payload.vehicleId
    }
    if (payload.type !== undefined) {
      rule.type = payload.type
    }
    if (payload.phoneNumber !== undefined) {
      rule.phoneNumber = payload.phoneNumber
    }
    if (payload.enabled !== undefined) {
      rule.enabled = payload.enabled
    }
    if (payload.threshold !== undefined) {
      rule.threshold = payload.threshold
    }

    await rule.save()
    res.json(rule)
  } catch (err) {
    logger.error(`[alert.updateRule] ${i18n.t('ERROR')} ${id}`, err)
    const message = err instanceof Error ? err.message : i18n.t('ERROR')
    res.status(400).json({ error: message })
  }
}

/**
 * DELETE /api/alerts/rules/:id — delete an alert rule owned by the authenticated user.
 */
export const deleteRule = async (req: Request, res: Response) => {
  const { id } = req.params
  try {
    const userId = req.user?._id
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }

    if (!helper.isValidObjectId(id)) {
      res.status(400).json({ error: 'Invalid rule id' })
      return
    }

    const result = await AlertRule.deleteOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(userId),
    })

    if (result.deletedCount === 0) {
      res.status(404).json({ error: 'Rule not found' })
      return
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[alert.deleteRule] ${i18n.t('ERROR')} ${id}`, err)
    res.status(400).json({ error: i18n.t('ERROR') })
  }
}

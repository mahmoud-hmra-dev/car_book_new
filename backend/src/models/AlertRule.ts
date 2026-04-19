import { Document, Schema, Types, model } from 'mongoose'

export type AlertRuleType = 'speed' | 'geofence' | 'panic' | 'maintenance'

export const ALERT_RULE_TYPES: AlertRuleType[] = ['speed', 'geofence', 'panic', 'maintenance']

export interface AlertRule extends Document {
  userId: Types.ObjectId
  vehicleId: string
  type: AlertRuleType
  phoneNumber: string
  enabled: boolean
  threshold?: number
  createdAt: Date
  updatedAt: Date
}

const alertRuleSchema = new Schema<AlertRule>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "can't be blank"],
      index: true,
    },
    vehicleId: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
      index: true,
    },
    type: {
      type: String,
      enum: ALERT_RULE_TYPES,
      required: [true, "can't be blank"],
      index: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "can't be blank"],
      trim: true,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    threshold: {
      type: Number,
      // Relevant for type === 'speed' (km/h). Optional otherwise.
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'AlertRule',
  },
)

// Common lookup: find all rules for a given vehicle/type combo quickly.
alertRuleSchema.index({ vehicleId: 1, type: 1, enabled: 1 })

const AlertRuleModel = model<AlertRule>('AlertRule', alertRuleSchema)

export default AlertRuleModel

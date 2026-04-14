import { Document, Schema, model } from 'mongoose'

export type GeofenceAutoCommandTrigger = 'geofenceEnter' | 'geofenceExit' | 'both'

export interface GeofenceAutoCommand extends Document {
  geofenceId: number
  carId: string
  triggerEvent: GeofenceAutoCommandTrigger
  commandType: string
  commandAttributes: Record<string, any>
  textChannel: boolean
  enabled: boolean
}

const geofenceAutoCommandSchema = new Schema<GeofenceAutoCommand>(
  {
    geofenceId: {
      type: Number,
      required: [true, "can't be blank"],
      index: true,
    },
    carId: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    triggerEvent: {
      type: String,
      enum: ['geofenceEnter', 'geofenceExit', 'both'],
      required: [true, "can't be blank"],
      default: 'both',
    },
    commandType: {
      type: String,
      required: [true, "can't be blank"],
    },
    commandAttributes: {
      type: Schema.Types.Mixed,
      default: {},
    },
    textChannel: {
      type: Boolean,
      default: false,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'GeofenceAutoCommand',
  },
)

const GeofenceAutoCommandModel = model<GeofenceAutoCommand>('GeofenceAutoCommand', geofenceAutoCommandSchema)

export default GeofenceAutoCommandModel

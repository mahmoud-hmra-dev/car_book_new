import { Document, Schema, model } from 'mongoose'

export const LOCATION_SHARE_EXPIRE_AT_INDEX_NAME = 'expireAt'

export interface LocationShare extends Document {
  token: string
  carId: string
  createdAt: Date
  expireAt: Date
}

const locationShareSchema = new Schema<LocationShare>(
  {
    token: {
      type: String,
      required: [true, "can't be blank"],
      unique: true,
      index: true,
    },
    carId: {
      type: String,
      required: [true, "can't be blank"],
      index: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    expireAt: {
      //
      // Location shares are temporary and are deleted automatically after 24h.
      //
      type: Date,
      required: [true, "can't be blank"],
      index: { name: LOCATION_SHARE_EXPIRE_AT_INDEX_NAME, expireAfterSeconds: 0, background: true },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'LocationShare',
  },
)

const LocationShareModel = model<LocationShare>('LocationShare', locationShareSchema)

export default LocationShareModel

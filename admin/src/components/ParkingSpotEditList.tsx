import React, { useEffect, useState } from 'react'
import { FormControl, Input, InputLabel } from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/parking-spot-edit-list'
import env from '@/config/env.config'
import PositionInput from './PositionInput'


interface ParkingSpotEditListProps {
  title?: string
  values?: bookcarsTypes.ParkingSpot[]
  onAdd?: (value: bookcarsTypes.ParkingSpot) => void
  onUpdate?: (value: bookcarsTypes.ParkingSpot, index: number) => void
  onDelete?: (value: bookcarsTypes.ParkingSpot, index: number) => void
}

const ParkingSpotEditList = (
  {
    title,
    values: _values,
    onAdd,
    onUpdate,
    onDelete,
  }: ParkingSpotEditListProps
) => {
  const [values, setValues] = useState(_values || [])

  useEffect(() => {
    if (_values) {
      setValues(_values)
    }
  }, [_values])

  return (
    <div className="p-5 bg-background rounded-xl">
      {title && <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">{title}</span>}

      <div className="space-y-3">
        {values.map((parkingSpot, index) => (
          <div key={parkingSpot._id || index} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-border">
            <div className="flex-1 space-y-2">
              {parkingSpot.values && env._LANGUAGES.map((language, langIndex) => (
                <FormControl key={language.code} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${language.label})`}</InputLabel>
                  <Input
                    type="text"
                    value={(parkingSpot.values![langIndex] && parkingSpot.values![langIndex].value) || ''}
                    required
                    onChange={(e) => {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                      const __parkingSpot = __values[index]
                      if (__parkingSpot._id) {
                        __parkingSpot.values![langIndex].value = e.target.value
                      } else {
                        __parkingSpot.values![langIndex] = {
                          language: language.code,
                          value: e.target.value,
                        }
                      }
                      if (onUpdate) {
                        onUpdate(__parkingSpot, index)
                      }
                      setValues(__values)
                    }}
                    autoComplete="off"
                  />
                </FormControl>
              ))}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.LATITUDE}</InputLabel>
                  <PositionInput
                    value={parkingSpot.latitude}
                    required
                    onChange={(e) => {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                      __values[index].latitude = e.target.value
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.LONGITUDE}</InputLabel>
                  <PositionInput
                    value={parkingSpot.longitude}
                    required
                    onChange={(e) => {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.ParkingSpot[]
                      __values[index].longitude = e.target.value
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }}
                  />
                </FormControl>
              </div>
            </div>

            <button
              type="button"
              className="w-9 h-9 rounded-xl hover:bg-danger/10 flex items-center justify-center text-text-muted hover:text-danger transition-all shrink-0 mt-3"
              onClick={() => {
                if (onDelete) {
                  onDelete(parkingSpot, index)
                } else {
                  values.splice(index, 1)
                  setValues(bookcarsHelper.clone(values))
                }
              }}
            >
              <DeleteIcon fontSize="small" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="flex items-center gap-2 text-sm text-primary font-semibold hover:text-primary-dark transition-colors mt-4"
        onClick={() => {
          const parkingSpot: bookcarsTypes.ParkingSpot = {
            latitude: '',
            longitude: '',
            values: [],
          }

          if (onAdd) {
            onAdd(parkingSpot)
          } else {
            values.push(parkingSpot)
          }
        }}
      >
        <AddIcon fontSize="small" />
        {strings.NEW_PARKING_SPOT}
      </button>
    </div>
  )
}

export default ParkingSpotEditList

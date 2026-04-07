import React, { useEffect, useState } from 'react'
import { TextField } from '@mui/material'
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/date-based-price-edit-list'
import DatePicker from './DatePicker'
import * as UserService from '@/services/UserService'


interface DateBasedPriceEditListProps {
  title?: string
  values?: bookcarsTypes.DateBasedPrice[]
  onAdd?: (value: bookcarsTypes.DateBasedPrice) => void
  onUpdate?: (value: bookcarsTypes.DateBasedPrice, index: number) => void
  onDelete?: (value: bookcarsTypes.DateBasedPrice, index: number) => void
}

const DateBasedPriceEditList = (
  {
    title,
    values: _values,
    onAdd,
    onUpdate,
    onDelete,
  }: DateBasedPriceEditListProps
) => {
  const [values, setValues] = useState<bookcarsTypes.DateBasedPrice[]>(_values || [])

  useEffect(() => {
    if (_values) {
      setValues(_values)
    }
  }, [_values])

  return (
    <div className="p-5 bg-background rounded-xl">
      {title && <span className="block text-[11px] font-bold text-text-muted uppercase tracking-wider mb-3">{title}</span>}

      <div className="space-y-3">
        {values.map((dateBasedPrice, index) => (
          <div key={dateBasedPrice._id || index} className="flex items-start gap-3 bg-white rounded-xl p-3 border border-border">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <DatePicker
                  label={commonStrings.START_DATE}
                  required
                  onChange={(date) => {
                    if (date && dateBasedPrice.endDate && new Date(dateBasedPrice.endDate).getTime() < date.getTime()) {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].startDate = date
                      __values[index].endDate = null
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    } else {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].startDate = date
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }
                  }}
                  language={UserService.getLanguage()}
                  variant="standard"
                  value={dateBasedPrice.startDate ? new Date(dateBasedPrice.startDate) : undefined}
                />
              </div>

              <div>
                <DatePicker
                  label={commonStrings.END_DATE}
                  required
                  onChange={(date) => {
                    if (date && dateBasedPrice.startDate && new Date(dateBasedPrice.startDate).getTime() > date.getTime()) {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].startDate = null
                      __values[index].endDate = date
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    } else {
                      const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                      __values[index].endDate = date
                      setValues(__values)
                      if (onUpdate) {
                        onUpdate(__values[index], index)
                      }
                    }
                  }}
                  language={UserService.getLanguage()}
                  variant="standard"
                  value={dateBasedPrice.endDate ? new Date(dateBasedPrice.endDate) : undefined}
                />
              </div>

              <div>
                <TextField
                  label={`${strings.DAILY_PRICE} (${commonStrings.CURRENCY})`}
                  slotProps={{
                    htmlInput: {
                      inputMode: 'numeric',
                      pattern: '^\\d+(\\.\\d+)?$'
                    }
                  }}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const __values = bookcarsHelper.clone(values) as bookcarsTypes.DateBasedPrice[]
                    __values[index].dailyPrice = e.target.value
                    setValues(__values)
                    if (onUpdate) {
                      onUpdate(__values[index], index)
                    }
                  }}
                  required
                  variant="standard"
                  autoComplete="off"
                  value={dateBasedPrice.dailyPrice.toString()}
                  fullWidth
                />
              </div>
            </div>

            <button
              type="button"
              className="w-9 h-9 rounded-xl hover:bg-danger/10 flex items-center justify-center text-text-muted hover:text-danger transition-all shrink-0 mt-3"
              onClick={() => {
                if (onDelete) {
                  onDelete(dateBasedPrice, index)
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
          const dateBasedPrice: bookcarsTypes.DateBasedPrice = {
            startDate: null,
            endDate: null,
            dailyPrice: '',
          }

          if (onAdd) {
            onAdd(dateBasedPrice)
          } else {
            values.push(dateBasedPrice)
          }
        }}
      >
        <AddIcon fontSize="small" />
        {strings.NEW_DATE_BASED_PRICE}
      </button>
    </div>
  )
}

export default DateBasedPriceEditList

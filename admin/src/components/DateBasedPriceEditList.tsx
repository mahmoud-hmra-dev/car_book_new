import React, { useEffect, useState } from 'react'
import { Button, FormControl, TextField } from '@mui/material'
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
      {title && <span className="text-text-muted text-sm font-medium">{title}</span>}

      <div>
        {
          values.map((dateBasedPrice, index) => (
            <div key={dateBasedPrice._id || index}>

              <div className="flex flex-row">
                <FormControl margin="dense" className="pr-4">
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
                </FormControl>

                <FormControl margin="dense" className="pr-4">
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
                </FormControl>
              </div>

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
                className="pr-4"
              />

              <div className="flex justify-end my-2.5">
                <Button
                  variant="outlined"
                  className="text-danger border-danger hover:bg-danger/5 normal-case rounded-lg"
                  size="small"
                  color="error"
                  onClick={() => {
                    if (onDelete) {
                      onDelete(dateBasedPrice, index)
                    } else {
                      values.splice(index, 1)
                      setValues(bookcarsHelper.clone(values))
                    }
                  }}
                >
                  {commonStrings.DELETE}
                </Button>
              </div>
            </div>
          ))
        }
      </div>

      <div className="flex justify-end mt-4">
        <Button
          variant="outlined"
          className="border-border text-text hover:bg-primary/5 normal-case rounded-lg"
          size="small"
          color="inherit"
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
          {strings.NEW_DATE_BASED_PRICE}
        </Button>
      </div>
    </div>
  )
}

export default DateBasedPriceEditList

import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'
import * as helper from '@/utils/helper'

interface AvailabilityFilterProps {
  className?: string
  onChange?: (values: bookcarsTypes.Availablity[]) => void
}

const allTypes = [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable]

const AvailabilityFilter = ({
  className,
  onChange
}: AvailabilityFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.Availablity[]>([])

  const availableRef = useRef<HTMLInputElement>(null)
  const unavailableRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && availableRef.current && unavailableRef.current) {
      availableRef.current.checked = true
      unavailableRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.Availablity[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allTypes : _values))
    }
  }

  const handleAvailableChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if (e.currentTarget instanceof HTMLInputElement) {
      if (e.currentTarget.checked) {
        values.push(bookcarsTypes.Availablity.Available)

        if (values.length === 2) {
          setAllChecked(true)
        }
      } else {
        values.splice(
          values.findIndex((v) => v === bookcarsTypes.Availablity.Available),
          1,
        )

        if (values.length === 0) {
          setAllChecked(false)
        }
      }

      setValues(values)

      handleOnChange(values)
    } else {
      helper.error()
    }
  }

  const handleAvailableClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleAvailableChange(event)
  }

  const handleUnavailableChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if (e.currentTarget instanceof HTMLInputElement) {
      if (e.currentTarget.checked) {
        values.push(bookcarsTypes.Availablity.Unavailable)

        if (values.length === 2) {
          setAllChecked(true)
        }
      } else {
        values.splice(
          values.findIndex((v) => v === bookcarsTypes.Availablity.Unavailable),
          1,
        )

        if (values.length === 0) {
          setAllChecked(false)
        }
      }

      setValues(values)

      handleOnChange(values)
    } else {
      helper.error()
    }
  }

  const handleUnavailableClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleUnavailableChange(event)
  }

  const handleUncheckAllChange = () => {
    if (availableRef.current && unavailableRef.current) {
      if (allChecked) {
        // uncheck all
        availableRef.current.checked = false
        unavailableRef.current.checked = false

        setAllChecked(false)
        setValues([])
      } else {
        // check all
        availableRef.current.checked = true
        unavailableRef.current.checked = true

        const _values = [bookcarsTypes.Availablity.Available, bookcarsTypes.Availablity.Unavailable]

        setAllChecked(true)
        setValues(_values)

        if (onChange) {
          onChange(bookcarsHelper.clone(_values))
        }
      }
    } else {
      helper.error()
    }
  }

  return (
    <Accordion title={strings.AVAILABILITY} className={className}>
      <div className="space-y-1">
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={availableRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleAvailableChange} />
          <span role="button" tabIndex={0} onClick={handleAvailableClick} className="text-sm text-text cursor-pointer hover:text-primary transition-colors">{strings.AVAILABLE}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={unavailableRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleUnavailableChange} />
          <span role="button" tabIndex={0} onClick={handleUnavailableClick} className="text-sm text-text cursor-pointer hover:text-primary transition-colors">{strings.UNAVAILABLE}</span>
        </div>
        <div className="text-center py-2">
          <button
            type="button"
            onClick={handleUncheckAllChange}
            className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors bg-transparent border-none cursor-pointer"
          >
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </button>
        </div>
      </div>
    </Accordion>
  )
}

export default AvailabilityFilter

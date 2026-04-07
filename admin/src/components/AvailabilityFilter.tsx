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
      <div className="px-1.5 py-2">
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={availableRef} type="checkbox" className="cursor-pointer" onChange={handleAvailableChange} />
          <span role="button" tabIndex={0} onClick={handleAvailableClick} className="cursor-pointer text-xs font-normal text-text hover:text-primary">{strings.AVAILABLE}</span>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={unavailableRef} type="checkbox" className="cursor-pointer" onChange={handleUnavailableChange} />
          <span role="button" tabIndex={0} onClick={handleUnavailableClick} className="cursor-pointer text-xs font-normal text-text hover:text-primary">{strings.UNAVAILABLE}</span>
        </div>
        <div className="text-center pb-2.5">
          <span role="button" tabIndex={0} onClick={handleUncheckAllChange} className="text-xs text-primary underline cursor-pointer">
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default AvailabilityFilter

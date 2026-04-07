import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'


interface MileageFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.Mileage[]) => void
}

const allTypes = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]

const MileageFilter = ({
  className,
  collapse,
  onChange
}: MileageFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.Mileage[]>([])

  const limitedRef = useRef<HTMLInputElement>(null)
  const unlimitedRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && limitedRef.current && unlimitedRef.current) {
      limitedRef.current.checked = true
      unlimitedRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.Mileage[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allTypes : _values))
    }
  }

  const handleLimitedMileageChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.Mileage.Limited)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.Mileage.Limited),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleLimitedMileageClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleLimitedMileageChange(event)
  }

  const handleUnlimitedMileageChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.Mileage.Unlimited)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.Mileage.Unlimited),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleUnlimitedMileageClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleUnlimitedMileageChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (limitedRef.current) {
        limitedRef.current.checked = false
      }
      if (unlimitedRef.current) {
        unlimitedRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (limitedRef.current) {
        limitedRef.current.checked = true
      }
      if (unlimitedRef.current) {
        unlimitedRef.current.checked = true
      }

      const _values = [bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited]

      setAllChecked(true)
      setValues(_values)

      if (onChange) {
        onChange(bookcarsHelper.clone(_values))
      }
    }
  }

  return (
    <Accordion title={strings.MILEAGE} collapse={collapse} className={className}>
      <div className="py-2 space-y-0.5">
        <div className="text-center py-1">
          <span
            onClick={handleUncheckAllChange}
            className="text-xs text-primary hover:underline cursor-pointer"
            role="button"
            tabIndex={0}
          >
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </span>
        </div>
        <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
          <input ref={limitedRef} type="checkbox" className="w-4 h-4 accent-primary" onChange={handleLimitedMileageChange} />
          <span
            onClick={handleLimitedMileageClick}
            role="button"
            tabIndex={0}
            className="text-sm text-text"
          >
            {strings.LIMITED}
          </span>
        </div>
        <div className="flex items-center gap-2.5 py-2 px-2 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
          <input ref={unlimitedRef} type="checkbox" className="w-4 h-4 accent-primary" onChange={handleUnlimitedMileageChange} />
          <span
            onClick={handleUnlimitedMileageClick}
            role="button"
            tabIndex={0}
            className="text-sm text-text"
          >
            {strings.UNLIMITED}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default MileageFilter

import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

import '@/assets/css/mileage-filter.css'

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

  const handleLimitedMileageClick = () => {
    if (limitedRef.current) {
      limitedRef.current.checked = !limitedRef.current.checked
      const syntheticEvent = { currentTarget: limitedRef.current } as React.ChangeEvent<HTMLInputElement>
      handleLimitedMileageChange(syntheticEvent)
    }
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

  const handleUnlimitedMileageClick = () => {
    if (unlimitedRef.current) {
      unlimitedRef.current.checked = !unlimitedRef.current.checked
      const syntheticEvent = { currentTarget: unlimitedRef.current } as React.ChangeEvent<HTMLInputElement>
      handleUnlimitedMileageChange(syntheticEvent)
    }
  }

  return (
    <Accordion title={strings.MILEAGE} collapse={collapse} className={`${className ? `${className} ` : ''}mileage-filter`}>
      <div className="filter-chips">
        <div
          className={`filter-chip${values.includes(bookcarsTypes.Mileage.Limited) ? ' active' : ''}`}
          onClick={handleLimitedMileageClick}
          role="button"
          tabIndex={0}
        >
          <input ref={limitedRef} type="checkbox" className="mileage-checkbox" onChange={handleLimitedMileageChange} />
          <span>{strings.LIMITED}</span>
        </div>
        <div
          className={`filter-chip${values.includes(bookcarsTypes.Mileage.Unlimited) ? ' active' : ''}`}
          onClick={handleUnlimitedMileageClick}
          role="button"
          tabIndex={0}
        >
          <input ref={unlimitedRef} type="checkbox" className="mileage-checkbox" onChange={handleUnlimitedMileageChange} />
          <span>{strings.UNLIMITED}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default MileageFilter

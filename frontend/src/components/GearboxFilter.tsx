import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

import '@/assets/css/gearbox-filter.css'

interface GearboxFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.GearboxType[]) => void
}

const allTypes = [bookcarsTypes.GearboxType.Manual, bookcarsTypes.GearboxType.Automatic]

const GearboxFilter = ({
  className,
  collapse,
  onChange
}: GearboxFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.GearboxType[]>([])

  const automaticRef = useRef<HTMLInputElement>(null)
  const manualRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && automaticRef.current && manualRef.current) {
      automaticRef.current.checked = true
      manualRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.GearboxType[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allTypes : _values))
    }
  }

  const handleCheckAutomaticChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.GearboxType.Automatic)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.GearboxType.Automatic),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleAutomaticClick = () => {
    if (automaticRef.current) {
      automaticRef.current.checked = !automaticRef.current.checked
      const syntheticEvent = { currentTarget: automaticRef.current } as React.ChangeEvent<HTMLInputElement>
      handleCheckAutomaticChange(syntheticEvent)
    }
  }

  const handleCheckManualChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.GearboxType.Manual)

      if (values.length === 2) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.GearboxType.Manual),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleManualClick = () => {
    if (manualRef.current) {
      manualRef.current.checked = !manualRef.current.checked
      const syntheticEvent = { currentTarget: manualRef.current } as React.ChangeEvent<HTMLInputElement>
      handleCheckManualChange(syntheticEvent)
    }
  }

  return (
    <Accordion title={strings.GEARBOX} collapse={collapse} className={`${className ? `${className} ` : ''}gearbox-filter`}>
      <div className="filter-chips">
        <div
          className={`filter-chip${values.includes(bookcarsTypes.GearboxType.Automatic) ? ' active' : ''}`}
          onClick={handleAutomaticClick}
          role="button"
          tabIndex={0}
        >
          <input ref={automaticRef} type="checkbox" className="gearbox-checkbox" onChange={handleCheckAutomaticChange} />
          <span>{strings.GEARBOX_AUTOMATIC}</span>
        </div>
        <div
          className={`filter-chip${values.includes(bookcarsTypes.GearboxType.Manual) ? ' active' : ''}`}
          onClick={handleManualClick}
          role="button"
          tabIndex={0}
        >
          <input ref={manualRef} type="checkbox" className="gearbox-checkbox" onChange={handleCheckManualChange} />
          <span>{strings.GEARBOX_MANUAL}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default GearboxFilter

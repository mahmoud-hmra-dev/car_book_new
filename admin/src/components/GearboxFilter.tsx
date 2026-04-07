import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

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

  const handleAutomaticClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckAutomaticChange(event)
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

  const handleManualClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckManualChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (automaticRef.current) {
        automaticRef.current.checked = false
      }
      if (manualRef.current) {
        manualRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (automaticRef.current) {
        automaticRef.current.checked = true
      }
      if (manualRef.current) {
        manualRef.current.checked = true
      }

      const _values = [bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual]

      setAllChecked(true)
      setValues(_values)

      if (onChange) {
        onChange(bookcarsHelper.clone(_values))
      }
    }
  }

  return (
    <Accordion title={strings.GEARBOX} collapse={collapse} className={className}>
      <div className="space-y-1">
        <div className="text-center py-2">
          <button
            type="button"
            onClick={handleUncheckAllChange}
            className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors bg-transparent border-none cursor-pointer"
          >
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </button>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={automaticRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckAutomaticChange} />
          <span onClick={handleAutomaticClick} role="button" tabIndex={0} className="text-sm text-text">{strings.GEARBOX_AUTOMATIC}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={manualRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckManualChange} />
          <span onClick={handleManualClick} role="button" tabIndex={0} className="text-sm text-text">{strings.GEARBOX_MANUAL}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default GearboxFilter

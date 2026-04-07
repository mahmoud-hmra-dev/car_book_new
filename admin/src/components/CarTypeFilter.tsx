import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Accordion from './Accordion'

interface CarTypeProps {
  className?: string
  collapse?: boolean
  onChange?: (values: bookcarsTypes.CarType[]) => void
}

const allTypes = bookcarsHelper.getAllCarTypes()

const CarType = ({
  className,
  collapse,
  onChange
}: CarTypeProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.CarType[]>([])

  const dieselRef = useRef<HTMLInputElement>(null)
  const gasolineRef = useRef<HTMLInputElement>(null)
  const electricRef = useRef<HTMLInputElement>(null)
  const hybridRef = useRef<HTMLInputElement>(null)
  const plugInHybridRef = useRef<HTMLInputElement>(null)
  const unknownRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked
      && dieselRef.current
      && gasolineRef.current
      && electricRef.current
      && hybridRef.current
      && plugInHybridRef.current
      && unknownRef.current) {
      dieselRef.current.checked = true
      gasolineRef.current.checked = true
      electricRef.current.checked = true
      hybridRef.current.checked = true
      plugInHybridRef.current.checked = true
      unknownRef.current.checked = true
    }
  }, [allChecked])

  const handleOnChange = (_values: bookcarsTypes.CarType[]) => {
    if (onChange) {
      onChange(bookcarsHelper.clone(_values.length === 0 ? allTypes : _values))
    }
  }

  const handleCheckDieselChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Diesel)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Diesel),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleDieselClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckDieselChange(event)
  }

  const handleCheckGasolineChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Gasoline)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Gasoline),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleGasolineClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckGasolineChange(event)
  }

  const handleCheckElectricChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Electric)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Electric),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleElectricClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckElectricChange(event)
  }

  const handleCheckHybridChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Hybrid)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Hybrid),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleHybridClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckHybridChange(event)
  }

  const handleCheckPlugInHybridChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.PlugInHybrid)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.PlugInHybrid),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handlePlugInHybridClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckPlugInHybridChange(event)
  }

  const handleCheckUnknownChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarType.Unknown)

      if (values.length === allTypes.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarType.Unknown),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    handleOnChange(values)
  }

  const handleUnknownClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckUnknownChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (dieselRef.current
        && gasolineRef.current
        && electricRef.current
        && hybridRef.current
        && plugInHybridRef.current
        && unknownRef.current) {
        dieselRef.current.checked = false
        gasolineRef.current.checked = false
        electricRef.current.checked = false
        hybridRef.current.checked = false
        plugInHybridRef.current.checked = false
        unknownRef.current.checked = false
      }
      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (dieselRef.current
        && gasolineRef.current
        && electricRef.current
        && hybridRef.current
        && plugInHybridRef.current
        && unknownRef.current) {
        dieselRef.current.checked = true
        gasolineRef.current.checked = true
        electricRef.current.checked = true
        hybridRef.current.checked = true
        plugInHybridRef.current.checked = true
        unknownRef.current.checked = true
      }
      const _values = allTypes

      setAllChecked(true)
      setValues(_values)

      if (onChange) {
        onChange(bookcarsHelper.clone(_values))
      }
    }
  }

  return (
    <Accordion title={strings.ENGINE} collapse={collapse} className={className}>
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
          <input ref={dieselRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckDieselChange} />
          <span onClick={handleDieselClick} role="button" tabIndex={0} className="text-sm text-text">{strings.DIESEL}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={gasolineRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckGasolineChange} />
          <span onClick={handleGasolineClick} role="button" tabIndex={0} className="text-sm text-text">{strings.GASOLINE}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={electricRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckElectricChange} />
          <span onClick={handleElectricClick} role="button" tabIndex={0} className="text-sm text-text">{strings.ELECTRIC}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={hybridRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckHybridChange} />
          <span onClick={handleHybridClick} role="button" tabIndex={0} className="text-sm text-text">{strings.HYBRID}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={plugInHybridRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckPlugInHybridChange} />
          <span onClick={handlePlugInHybridClick} role="button" tabIndex={0} className="text-sm text-text">{strings.PLUG_IN_HYBRID}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={unknownRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckUnknownChange} />
          <span onClick={handleUnknownClick} role="button" tabIndex={0} className="text-sm text-text">{strings.UNKNOWN}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarType

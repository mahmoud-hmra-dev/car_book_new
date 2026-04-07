import React, { useState, useEffect, useRef } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-multimedia-filter'
import Accordion from './Accordion'

interface CarMultimediaFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.CarMultimedia[]) => void
}

const allMultimedias = bookcarsHelper.getAllMultimedias()

const CarMultimediaFilter = ({
  className,
  collapse,
  onChange
}: CarMultimediaFilterProps) => {
  const [allChecked, setAllChecked] = useState(false)
  const [values, setValues] = useState<bookcarsTypes.CarMultimedia[]>([])

  const touchscreenRef = useRef<HTMLInputElement>(null)
  const bluetoothRef = useRef<HTMLInputElement>(null)
  const androidAutoRef = useRef<HTMLInputElement>(null)
  const appleCarPlayRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (allChecked && touchscreenRef.current && bluetoothRef.current && androidAutoRef.current && appleCarPlayRef.current) {
      touchscreenRef.current.checked = true
      bluetoothRef.current.checked = true
      androidAutoRef.current.checked = true
      appleCarPlayRef.current.checked = true
    }
  }, [allChecked])

  const handleCheckTouchscreenChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarMultimedia.Touchscreen)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.Touchscreen),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleTouchscreenClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckTouchscreenChange(event)
  }

  const handleCheckBluetoothChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarMultimedia.Bluetooth)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.Bluetooth),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleBluetoothClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckBluetoothChange(event)
  }

  const handleCheckAndroidAutoChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarMultimedia.AndroidAuto)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.AndroidAuto),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleAndroidAutoClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckAndroidAutoChange(event)
  }

  const handleCheckAppleCarPlayChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      values.push(bookcarsTypes.CarMultimedia.AppleCarPlay)

      if (values.length === allMultimedias.length) {
        setAllChecked(true)
      }
    } else {
      values.splice(
        values.findIndex((v) => v === bookcarsTypes.CarMultimedia.AppleCarPlay),
        1,
      )

      if (values.length === 0) {
        setAllChecked(false)
      }
    }

    setValues(values)

    if (onChange) {
      onChange(bookcarsHelper.clone(values))
    }
  }

  const handleAppleCarPlayClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckAppleCarPlayChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      if (touchscreenRef.current) {
        touchscreenRef.current.checked = false
      }
      if (bluetoothRef.current) {
        bluetoothRef.current.checked = false
      }
      if (androidAutoRef.current) {
        androidAutoRef.current.checked = false
      }
      if (appleCarPlayRef.current) {
        appleCarPlayRef.current.checked = false
      }

      setAllChecked(false)
      setValues([])
    } else {
      // check all
      if (touchscreenRef.current) {
        touchscreenRef.current.checked = true
      }
      if (bluetoothRef.current) {
        bluetoothRef.current.checked = true
      }
      if (androidAutoRef.current) {
        androidAutoRef.current.checked = true
      }
      if (appleCarPlayRef.current) {
        appleCarPlayRef.current.checked = true
      }

      setAllChecked(true)
      setValues(allMultimedias)

      if (onChange) {
        onChange(bookcarsHelper.clone(allMultimedias))
      }
    }
  }

  return (
    <Accordion title={strings.MULTIMEDIA} collapse={collapse} className={className}>
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
          <input ref={touchscreenRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckTouchscreenChange} />
          <span onClick={handleTouchscreenClick} role="button" tabIndex={0} className="text-sm text-text">{strings.TOUCHSCREEN}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={bluetoothRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckBluetoothChange} />
          <span onClick={handleBluetoothClick} role="button" tabIndex={0} className="text-sm text-text">{strings.BLUETOOTH}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={androidAutoRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckAndroidAutoChange} />
          <span onClick={handleAndroidAutoClick} role="button" tabIndex={0} className="text-sm text-text">{strings.ANDROID_AUTO}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={appleCarPlayRef} type="checkbox" className="w-5 h-5 accent-primary cursor-pointer rounded" onChange={handleCheckAppleCarPlayChange} />
          <span onClick={handleAppleCarPlayClick} role="button" tabIndex={0} className="text-sm text-text">{strings.APPLE_CAR_PLAY}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarMultimediaFilter

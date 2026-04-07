import React, { useEffect, useRef } from 'react'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-seats-filter'
import Accordion from './Accordion'


interface CarSeatsFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: number) => void
}

const CarSeatsFilter = ({
  className,
  collapse,
  onChange
}: CarSeatsFilterProps) => {
  const twoRef = useRef<HTMLInputElement>(null)
  const fourRef = useRef<HTMLInputElement>(null)
  const fiveRef = useRef<HTMLInputElement>(null)
  const fivePlusRef = useRef<HTMLInputElement>(null)
  const anyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (anyRef.current) {
      anyRef.current.checked = true
    }
  }, [])

  const handleAnyChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = -1
      if (twoRef.current) {
        twoRef.current.checked = false
      }
      if (fourRef.current) {
        fourRef.current.checked = false
      }
      if (fiveRef.current) {
        fiveRef.current.checked = false
      }
      if (fivePlusRef.current) {
        fivePlusRef.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleAnyClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleAnyChange(event)
    }
  }

  const handleCheckTwoChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 2
      if (anyRef.current) {
        anyRef.current.checked = false
      }
      if (fourRef.current) {
        fourRef.current.checked = false
      }
      if (fiveRef.current) {
        fiveRef.current.checked = false
      }
      if (fivePlusRef.current) {
        fivePlusRef.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleTwoClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckTwoChange(event)
    }
  }

  const handleCheckFourChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 4
      if (anyRef.current) {
        anyRef.current.checked = false
      }
      if (twoRef.current) {
        twoRef.current.checked = false
      }
      if (fiveRef.current) {
        fiveRef.current.checked = false
      }
      if (fivePlusRef.current) {
        fivePlusRef.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleFourClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckFourChange(event)
    }
  }

  const handleCheckFiveChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 5
      if (anyRef.current) {
        anyRef.current.checked = false
      }
      if (twoRef.current) {
        twoRef.current.checked = false
      }
      if (fourRef.current) {
        fourRef.current.checked = false
      }
      if (fivePlusRef.current) {
        fivePlusRef.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleFiveClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckFiveChange(event)
    }
  }

  const handleCheckFivePlusChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      const value = 6
      if (anyRef.current) {
        anyRef.current.checked = false
      }
      if (twoRef.current) {
        twoRef.current.checked = false
      }
      if (fourRef.current) {
        fourRef.current.checked = false
      }
      if (fiveRef.current) {
        fiveRef.current.checked = false
      }
      if (onChange) {
        onChange(value)
      }
    }
  }

  const handleFivePlusClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckFivePlusChange(event)
    }
  }

  return (
    <Accordion title={strings.SEATS} collapse={collapse} className={className}>
      <div className="px-1.5 py-2">
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={twoRef} type="radio" className="cursor-pointer" onChange={handleCheckTwoChange} />
          <span
            onClick={handleTwoClick}
            role="button"
            tabIndex={0}
            className="cursor-pointer text-xs font-normal capitalize text-text hover:text-primary"
          >
            {strings.TWO}
          </span>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={fourRef} type="radio" className="cursor-pointer" onChange={handleCheckFourChange} />
          <span
            onClick={handleFourClick}
            role="button"
            tabIndex={0}
            className="cursor-pointer text-xs font-normal capitalize text-text hover:text-primary"
          >
            {strings.FOUR}
          </span>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={fiveRef} type="radio" className="cursor-pointer" onChange={handleCheckFiveChange} />
          <span
            onClick={handleFiveClick}
            role="button"
            tabIndex={0}
            className="cursor-pointer text-xs font-normal capitalize text-text hover:text-primary"
          >
            {strings.FIVE}
          </span>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={fivePlusRef} type="radio" className="cursor-pointer" onChange={handleCheckFivePlusChange} />
          <span
            onClick={handleFivePlusClick}
            role="button"
            tabIndex={0}
            className="cursor-pointer text-xs font-normal capitalize text-text hover:text-primary"
          >
            {strings.FIVE_PLUS}
          </span>
        </div>
        <div className="flex items-center gap-2 py-1.5 px-1">
          <input ref={anyRef} type="radio" className="cursor-pointer" onChange={handleAnyChange} />
          <span
            onClick={handleAnyClick}
            role="button"
            tabIndex={0}
            className="cursor-pointer text-xs font-normal capitalize text-text hover:text-primary"
          >
            {commonStrings.ANY}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarSeatsFilter

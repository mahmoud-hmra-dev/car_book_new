import React, { useEffect, useRef, useState } from 'react'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-seats-filter'
import Accordion from './Accordion'

import '@/assets/css/car-seats-filter.css'

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
  const [selected, setSelected] = useState(-1)

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

  const handleSelect = (value: number) => {
    setSelected(value)

    // uncheck all radios first
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
    if (anyRef.current) {
      anyRef.current.checked = false
    }

    // check the selected one
    if (value === -1 && anyRef.current) {
      anyRef.current.checked = true
    }
    if (value === 2 && twoRef.current) {
      twoRef.current.checked = true
    }
    if (value === 4 && fourRef.current) {
      fourRef.current.checked = true
    }
    if (value === 5 && fiveRef.current) {
      fiveRef.current.checked = true
    }
    if (value === 6 && fivePlusRef.current) {
      fivePlusRef.current.checked = true
    }

    if (onChange) {
      onChange(value)
    }
  }

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

  return (
    <Accordion title={strings.SEATS} collapse={collapse} className={`${className ? `${className} ` : ''}seats-filter`}>
      <div className="filter-badges">
        <div
          className={`filter-badge${selected === 2 ? ' active' : ''}`}
          onClick={() => handleSelect(2)}
          role="button"
          tabIndex={0}
        >
          <input ref={twoRef} type="radio" className="seats-checkbox" onChange={handleCheckTwoChange} />
          <span>2</span>
        </div>
        <div
          className={`filter-badge${selected === 4 ? ' active' : ''}`}
          onClick={() => handleSelect(4)}
          role="button"
          tabIndex={0}
        >
          <input ref={fourRef} type="radio" className="seats-checkbox" onChange={handleCheckFourChange} />
          <span>4</span>
        </div>
        <div
          className={`filter-badge${selected === 5 ? ' active' : ''}`}
          onClick={() => handleSelect(5)}
          role="button"
          tabIndex={0}
        >
          <input ref={fiveRef} type="radio" className="seats-checkbox" onChange={handleCheckFiveChange} />
          <span>5</span>
        </div>
        <div
          className={`filter-badge${selected === 6 ? ' active' : ''}`}
          onClick={() => handleSelect(6)}
          role="button"
          tabIndex={0}
        >
          <input ref={fivePlusRef} type="radio" className="seats-checkbox" onChange={handleCheckFivePlusChange} />
          <span>{strings.FIVE_PLUS}</span>
        </div>
        <div
          className={`filter-badge badge-wide${selected === -1 ? ' active' : ''}`}
          onClick={() => handleSelect(-1)}
          role="button"
          tabIndex={0}
        >
          <input ref={anyRef} type="radio" className="seats-checkbox" onChange={handleAnyChange} />
          <span>{commonStrings.ANY}</span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarSeatsFilter

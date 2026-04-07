import React, { useEffect, useRef } from 'react'
import { Rating } from '@mui/material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-rating-filter'
import Accordion from './Accordion'


interface CarRatingFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: number) => void
}

const CarRatingFilter = ({
  className,
  collapse,
  onChange
}: CarRatingFilterProps) => {
  const rating1Ref = useRef<HTMLInputElement>(null)
  const rating2Ref = useRef<HTMLInputElement>(null)
  const rating3Ref = useRef<HTMLInputElement>(null)
  const rating4Ref = useRef<HTMLInputElement>(null)
  const ratingAnyRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (ratingAnyRef.current) {
      ratingAnyRef.current.checked = true
    }
  }, [])

  const handleOnChange = (_value: number) => {
    if (onChange) {
      onChange(_value)
    }
  }

  const handleCheckRating1Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      if (rating2Ref.current) {
        rating2Ref.current.checked = false
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = false
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = false
      }
      if (ratingAnyRef.current) {
        ratingAnyRef.current.checked = false
      }

      handleOnChange(1)
    }
  }

  const handleRating1Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckRating1Change(event)
    }
  }

  const handleCheckRating2Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      if (rating1Ref.current) {
        rating1Ref.current.checked = false
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = false
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = false
      }
      if (ratingAnyRef.current) {
        ratingAnyRef.current.checked = false
      }

      handleOnChange(2)
    }
  }

  const handleRating2Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckRating2Change(event)
    }
  }

  const handleCheckRating3Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      if (rating1Ref.current) {
        rating1Ref.current.checked = false
      }
      if (rating2Ref.current) {
        rating2Ref.current.checked = false
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = false
      }
      if (ratingAnyRef.current) {
        ratingAnyRef.current.checked = false
      }

      handleOnChange(3)
    }
  }

  const handleRating3Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckRating3Change(event)
    }
  }

  const handleCheckRating4Change = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      if (rating1Ref.current) {
        rating1Ref.current.checked = false
      }
      if (rating2Ref.current) {
        rating2Ref.current.checked = false
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = false
      }
      if (ratingAnyRef.current) {
        ratingAnyRef.current.checked = false
      }

      handleOnChange(4)
    }
  }

  const handleRating4Click = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckRating4Change(event)
    }
  }

  const handleCheckRatingAnyChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      if (rating1Ref.current) {
        rating1Ref.current.checked = false
      }
      if (rating2Ref.current) {
        rating2Ref.current.checked = false
      }
      if (rating3Ref.current) {
        rating3Ref.current.checked = false
      }
      if (rating4Ref.current) {
        rating4Ref.current.checked = false
      }

      handleOnChange(-1)
    }
  }

  const handleRatingAnyClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    if (!checkbox.checked) {
      checkbox.checked = !checkbox.checked
      const event = e
      event.currentTarget = checkbox
      handleCheckRatingAnyChange(event)
    }
  }

  return (
    <Accordion title={strings.RATING} collapse={collapse} className={className}>
      <div className="px-1.5 py-2">
        <div className="flex flex-row items-center w-fit m-1.5">
          <input ref={rating1Ref} type="radio" className="cursor-pointer ml-1.5" onChange={handleCheckRating1Change} />
          <span onClick={handleRating1Click} role="presentation" className="cursor-pointer inline-block px-1">
            <Rating value={1} className="relative -bottom-1" readOnly />
          </span>
          <span className="text-xs text-text-muted mt-1">{strings.RATING_1}</span>
        </div>
        <div className="flex flex-row items-center w-fit m-1.5">
          <input ref={rating2Ref} type="radio" className="cursor-pointer ml-1.5" onChange={handleCheckRating2Change} />
          <span onClick={handleRating2Click} role="presentation" className="cursor-pointer inline-block px-1">
            <Rating value={2} className="relative -bottom-1" readOnly />
          </span>
          <span className="text-xs text-text-muted mt-1">{strings.RATING_2}</span>
        </div>
        <div className="flex flex-row items-center w-fit m-1.5" role="presentation">
          <input ref={rating3Ref} type="radio" className="cursor-pointer ml-1.5" onChange={handleCheckRating3Change} />
          <span onClick={handleRating3Click} role="presentation" className="cursor-pointer inline-block px-1">
            <Rating value={3} className="relative -bottom-1" readOnly />
          </span>
          <span className="text-xs text-text-muted mt-1">{strings.RATING_3}</span>
        </div>
        <div className="flex flex-row items-center w-fit m-1.5" role="presentation">
          <input ref={rating4Ref} type="radio" className="cursor-pointer ml-1.5" onChange={handleCheckRating4Change} />
          <span onClick={handleRating4Click} role="presentation" className="cursor-pointer inline-block px-1">
            <Rating value={4} className="relative -bottom-1" readOnly />
          </span>
          <span className="text-xs text-text-muted mt-1">{strings.RATING_4}</span>
        </div>
        <div className="flex flex-row items-center w-fit m-1.5" role="presentation">
          <input ref={ratingAnyRef} type="radio" className="cursor-pointer ml-1.5" onChange={handleCheckRatingAnyChange} />
          <span onClick={handleRatingAnyClick} role="presentation" className="cursor-pointer inline-block px-1">
            {commonStrings.ANY}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarRatingFilter

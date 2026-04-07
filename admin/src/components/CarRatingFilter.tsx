import React, { useEffect, useRef } from 'react'
import { Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/car-rating-filter'
import Accordion from './Accordion'

interface CarRatingFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: number) => void
}

const StarRating = ({ count }: { count: number }) => (
  <span className="inline-flex items-center gap-0.5">
    {Array.from({ length: 4 }, (_, i) => (
      i < count
        ? <StarIcon key={i} className="!w-4 !h-4 text-warning" />
        : <StarBorderIcon key={i} className="!w-4 !h-4 text-border" />
    ))}
  </span>
)

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
      <div className="space-y-1">
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={rating1Ref} type="radio" className="w-5 h-5 accent-primary cursor-pointer" onChange={handleCheckRating1Change} />
          <span onClick={handleRating1Click} role="presentation" className="cursor-pointer inline-flex items-center gap-2">
            <StarRating count={1} />
          </span>
          <span className="text-xs text-text-muted">{strings.RATING_1}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={rating2Ref} type="radio" className="w-5 h-5 accent-primary cursor-pointer" onChange={handleCheckRating2Change} />
          <span onClick={handleRating2Click} role="presentation" className="cursor-pointer inline-flex items-center gap-2">
            <StarRating count={2} />
          </span>
          <span className="text-xs text-text-muted">{strings.RATING_2}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={rating3Ref} type="radio" className="w-5 h-5 accent-primary cursor-pointer" onChange={handleCheckRating3Change} />
          <span onClick={handleRating3Click} role="presentation" className="cursor-pointer inline-flex items-center gap-2">
            <StarRating count={3} />
          </span>
          <span className="text-xs text-text-muted">{strings.RATING_3}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={rating4Ref} type="radio" className="w-5 h-5 accent-primary cursor-pointer" onChange={handleCheckRating4Change} />
          <span onClick={handleRating4Click} role="presentation" className="cursor-pointer inline-flex items-center gap-2">
            <StarRating count={4} />
          </span>
          <span className="text-xs text-text-muted">{strings.RATING_4}</span>
        </div>
        <div className="flex items-center gap-3 py-2.5 px-3 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
          <input ref={ratingAnyRef} type="radio" className="w-5 h-5 accent-primary cursor-pointer" onChange={handleCheckRatingAnyChange} />
          <span onClick={handleRatingAnyClick} role="presentation" className="text-sm text-text cursor-pointer">
            {commonStrings.ANY}
          </span>
        </div>
      </div>
    </Accordion>
  )
}

export default CarRatingFilter

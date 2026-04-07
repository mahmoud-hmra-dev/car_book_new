import React, { useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import Accordion from '@/components/Accordion'
import BookingStatus from './BookingStatus'

interface StatusFilterProps {
  className?: string
  collapse?: boolean
  onChange?: (value: bookcarsTypes.BookingStatus[]) => void
}

const statuses = helper.getBookingStatuses()
const allStatuses = bookcarsHelper.getAllBookingStatuses()

const StatusFilter = ({
  className,
  collapse,
  onChange
}: StatusFilterProps) => {
  const [checkedStatuses, setCheckedStatuses] = useState<bookcarsTypes.BookingStatus[]>([])
  const [allChecked, setAllChecked] = useState(false)

  const refs = useRef<(HTMLInputElement | null)[]>([])

  const handleChange = (_checkedStatuses: bookcarsTypes.BookingStatus[]) => {
    if (onChange) {
      onChange(_checkedStatuses.length === 0 ? allStatuses : bookcarsHelper.clone(_checkedStatuses))
    }
  }

  const handleCheckStatusChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const status = e.currentTarget.getAttribute('data-value') as bookcarsTypes.BookingStatus

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      checkedStatuses.push(status)

      if (checkedStatuses.length === allStatuses.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedStatuses.findIndex((s) => s === status)
      checkedStatuses.splice(index, 1)

      if (checkedStatuses.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedStatuses(checkedStatuses)
    handleChange(checkedStatuses)
  }

  const handleStatusClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckStatusChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = false
        }
      })

      setAllChecked(false)
      setCheckedStatuses([])
    } else {
      // check all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = true
        }
      })

      setAllChecked(true)
      setCheckedStatuses(allStatuses)

      handleChange(allStatuses)
    }
  }

  return (
    (allStatuses.length > 0 && (
      <Accordion title={commonStrings.STATUS} collapse={collapse} className={className}>
        <div className="space-y-1">
          <ul className="list-none m-0 px-3 pb-0 flex flex-wrap gap-2 justify-center">
            {statuses.map((status, index) => (
              <li key={status.value} className="flex items-center gap-1.5 py-1.5 px-1 rounded-xl cursor-pointer hover:bg-primary/5 transition-all">
                <input
                  ref={(ref) => {
                    refs.current[index] = ref
                  }}
                  type="checkbox"
                  data-value={status.value}
                  className="w-5 h-5 accent-primary cursor-pointer rounded"
                  onChange={handleCheckStatusChange}
                />
                <BookingStatus value={status.value} onClick={handleStatusClick} />
              </li>
            ))}
          </ul>
          <div className="text-center py-2">
            <button
              type="button"
              onClick={handleUncheckAllChange}
              className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors bg-transparent border-none cursor-pointer"
            >
              {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
            </button>
          </div>
        </div>
      </Accordion>
    )) || <></>
  )
}

export default StatusFilter

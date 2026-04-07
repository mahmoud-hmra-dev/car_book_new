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
      <Accordion title={commonStrings.STATUS} collapse={collapse} className={`${className ? `${className} ` : ''}bg-white mt-2.5 mr-2.5 border border-border rounded-xl shadow-sm text-[13px]`}>
        <ul className="list-none text-[13px] mt-3 mb-0 mx-0 px-3 pb-0 flex flex-wrap gap-2 justify-center">
          {statuses.map((status, index) => (
            <li key={status.value} className="flex items-center gap-1.5 py-1.5 px-1 rounded-md cursor-pointer hover:bg-primary/5 transition-colors">
              <input
                ref={(ref) => {
                  refs.current[index] = ref
                }}
                type="checkbox"
                data-value={status.value}
                className="cursor-pointer accent-primary"
                onChange={handleCheckStatusChange}
              />
              <BookingStatus value={status.value} onClick={handleStatusClick} />
            </li>
          ))}
        </ul>
        <div className="text-center py-2.5">
          <span
            onClick={handleUncheckAllChange}
            className="text-xs text-primary hover:underline cursor-pointer py-1"
            role="button"
            tabIndex={0}
          >
            {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
          </span>
        </div>
      </Accordion>
    )) || <></>
  )
}

export default StatusFilter

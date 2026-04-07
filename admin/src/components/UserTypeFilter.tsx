import React, { useEffect, useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'

interface UserTypeFilterProps {
  className?: string
  onChange?: (types: bookcarsTypes.UserType[]) => void
}

const userTypeBadgeMap: Record<string, string> = {
  admin: 'bg-text text-white',
  supplier: 'bg-warning text-white',
  user: 'bg-success text-white',
}

const UserTypeFilter = ({
  className,
  onChange
}: UserTypeFilterProps) => {
  const userTypes = helper.getUserTypes()
  const [checkedUserTypes, setCheckedUserTypes] = useState<bookcarsTypes.UserType[]>(userTypes.map((user) => user.value))
  const [allChecked, setAllChecked] = useState(true)
  const refs = useRef<(HTMLInputElement)[]>([])

  useEffect(() => {
    refs.current.forEach((checkbox: HTMLInputElement) => {
      checkbox.checked = true
    })
  }, [])

  const handleUserTypeChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const userType = e.currentTarget.getAttribute('data-value') as bookcarsTypes.UserType
    const checkbox = e.currentTarget as HTMLInputElement

    if (checkbox.checked) {
      checkedUserTypes.push(userType)

      if (checkedUserTypes.length === userTypes.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedUserTypes.findIndex((s) => s === userType)
      checkedUserTypes.splice(index, 1)

      if (checkedUserTypes.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedUserTypes(checkedUserTypes)

    if (onChange) {
      onChange(bookcarsHelper.clone(checkedUserTypes))
    }
  }

  const handleUserTypeClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleUserTypeChange(event)
  }

  const handleUncheckAllChange = () => {
    if (allChecked) {
      // uncheck all
      refs.current.forEach((checkbox: HTMLInputElement) => {
        checkbox.checked = false
      })

      setAllChecked(false)
      setCheckedUserTypes([])
    } else {
      // check all
      refs.current.forEach((checkbox: HTMLInputElement) => {
        checkbox.checked = true
      })

      const _userTypes = userTypes.map((user) => user.value)
      setAllChecked(true)
      setCheckedUserTypes(_userTypes)

      if (onChange) {
        onChange(bookcarsHelper.clone(_userTypes))
      }
    }
  }

  return (
    <div className={`bg-white border border-border rounded-2xl shadow-sm p-4${className ? ` ${className}` : ''}`}>
      <ul className="list-none m-0 p-0 flex flex-wrap gap-2.5 justify-center">
        {userTypes.map((userType, index) => (
          <li key={userType.value} className="flex items-center gap-2">
            <input
              ref={(ref) => {
                refs.current[index] = ref as HTMLInputElement
              }}
              type="checkbox"
              data-value={userType.value}
              className="w-5 h-5 accent-primary cursor-pointer rounded"
              onChange={handleUserTypeChange}
            />
            <span
              onClick={handleUserTypeClick}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-opacity hover:opacity-80 ${userTypeBadgeMap[userType.value?.toLowerCase()] || 'bg-text-muted/10 text-text-muted'}`}
              role="button"
              tabIndex={0}
            >
              {helper.getUserType(userType.value)}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-center pt-3">
        <button
          type="button"
          onClick={handleUncheckAllChange}
          className="text-xs text-primary font-semibold hover:text-primary-dark transition-colors bg-transparent border-none cursor-pointer"
        >
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </button>
      </div>
    </div>
  )
}

export default UserTypeFilter

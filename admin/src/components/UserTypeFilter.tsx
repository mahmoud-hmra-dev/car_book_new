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
    <div className={`${className ? `${className} ` : ''}bg-white border border-border rounded-xl shadow-sm p-3`}>
      <ul className="list-none m-0 p-0 flex flex-wrap gap-2 justify-center">
        {userTypes.map((userType, index) => (
          <li key={userType.value} className="flex items-center gap-2">
            <input
              ref={(ref) => {
                refs.current[index] = ref as HTMLInputElement
              }}
              type="checkbox"
              data-value={userType.value}
              className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
              onChange={handleUserTypeChange}
            />
            <span
              onClick={handleUserTypeClick}
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold cursor-pointer ${userTypeBadgeMap[userType.value?.toLowerCase()] || 'bg-text-muted/10 text-text-muted'}`}
              role="button"
              tabIndex={0}
            >
              {helper.getUserType(userType.value)}
            </span>
          </li>
        ))}
      </ul>
      <div className="text-center pt-2">
        <span
          onClick={handleUncheckAllChange}
          className="text-xs text-primary hover:underline cursor-pointer"
          role="button"
          tabIndex={0}
        >
          {allChecked ? commonStrings.UNCHECK_ALL : commonStrings.CHECK_ALL}
        </span>
      </div>
    </div>
  )
}

export default UserTypeFilter

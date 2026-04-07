import React, { useEffect, useRef, useState } from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import * as helper from '@/utils/helper'
import Accordion from './Accordion'


interface SupplierFilterProps {
  suppliers: bookcarsTypes.User[]
  collapse?: boolean
  className?: string
  onChange?: (value: string[]) => void
}

const SupplierFilter = ({
  suppliers: __suppliers,
  collapse,
  className,
  onChange
}: SupplierFilterProps) => {
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [checkedSuppliers, setCheckedSuppliers] = useState<string[]>([])
  const [allChecked, setAllChecked] = useState(false)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    setSuppliers(__suppliers)
  }, [__suppliers])

  const handleCheckSupplierChange = (e: React.ChangeEvent<HTMLInputElement> | React.MouseEvent<HTMLElement>) => {
    const supplierId = e.currentTarget.getAttribute('data-id') as string

    if ('checked' in e.currentTarget && e.currentTarget.checked) {
      checkedSuppliers.push(supplierId)

      if (checkedSuppliers.length === suppliers.length) {
        setAllChecked(true)
      }
    } else {
      const index = checkedSuppliers.indexOf(supplierId)
      checkedSuppliers.splice(index, 1)

      if (checkedSuppliers.length === 0) {
        setAllChecked(false)
      }
    }

    setCheckedSuppliers(checkedSuppliers)

    if (onChange) {
      if (checkedSuppliers.length === 0) {
        onChange(bookcarsHelper.clone(bookcarsHelper.flattenSuppliers(__suppliers)))
      } else {
        onChange(bookcarsHelper.clone(checkedSuppliers))
      }
    }
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
      setCheckedSuppliers([])
    } else {
      // check all
      refs.current.forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = true
        }
      })

      const supplierIds = bookcarsHelper.flattenSuppliers(suppliers)
      setAllChecked(true)
      setCheckedSuppliers(supplierIds)

      if (onChange) {
        onChange(bookcarsHelper.clone(supplierIds))
      }
    }
  }

  const handleSupplierClick = (e: React.MouseEvent<HTMLElement>) => {
    const checkbox = e.currentTarget.previousSibling as HTMLInputElement
    checkbox.checked = !checkbox.checked
    const event = e
    event.currentTarget = checkbox
    handleCheckSupplierChange(event)
  }

  return (
    (
      (suppliers.length > 1)
      && (
        <Accordion
          title={commonStrings.SUPPLIER}
          collapse={collapse}
          offsetHeight={Math.floor((suppliers.length / 2) * env.SUPPLIER_IMAGE_HEIGHT)}
          className={`${className ? `${className} ` : ''}bg-white mt-2.5 mr-2.5 border border-border rounded-xl shadow-sm text-[13px]`}
        >
          <div className="py-2 space-y-0.5">
            <ul className="list-none m-0 p-3 flex flex-wrap gap-3 justify-center">
              {suppliers.map((supplier, index) => (
                <li key={supplier._id} className="flex items-center gap-2">
                  <input
                    ref={(ref) => {
                      refs.current[index] = ref
                    }}
                    type="checkbox"
                    data-id={supplier._id}
                    className="w-4 h-4 rounded border-border text-primary accent-primary cursor-pointer"
                    onChange={handleCheckSupplierChange}
                  />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleSupplierClick}
                    className="cursor-pointer flex items-center justify-center w-[60px] h-[30px] border border-border rounded-md hover:border-primary transition-colors"
                  >
                    <img
                      src={helper.supplierImageURL(supplier.avatar)}
                      alt={supplier.fullName}
                      title={supplier.fullName}
                      className="max-w-full max-h-full object-contain"
                    />
                  </span>
                  {!!supplier.carCount && <span className="text-xs text-text-muted">{`(${supplier.carCount})`}</span>}
                </li>
              ))}
            </ul>
            <div className="text-center py-1">
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
        </Accordion>
      )
    ) || <></>
  )
}

export default SupplierFilter

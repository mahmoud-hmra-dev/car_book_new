import React from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface SupplierBadgeProps {
    supplier: bookcarsTypes.User
}

const SupplierBadge = ({ supplier }: SupplierBadgeProps) => {
    return supplier && (
        <div className="flex items-center text-text-secondary text-sm leading-4 max-w-[200px]" title={supplier.fullName}>
            <span className="border border-border rounded-md flex flex-col items-center justify-center w-[62px] h-8 mt-1">
                <img src={helper.supplierImageURL(supplier.avatar)} alt={supplier.fullName} className="max-w-full max-h-full" />
            </span>
            <a href={`/supplier?c=${supplier._id}`} className="text-primary text-[0.9em] whitespace-nowrap ml-1.5 overflow-hidden text-ellipsis w-[200px]">
                {supplier.fullName}
            </a>
        </div>
    )
}

export default SupplierBadge

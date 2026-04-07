import React from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface SupplierBadgeProps {
    supplier: bookcarsTypes.User
}

const SupplierBadge = ({ supplier }: SupplierBadgeProps) => {
    return supplier && (
        <div className="flex items-center text-text-secondary text-sm leading-4 max-w-[200px]" title={supplier.fullName}>
            <span className="border border-border rounded-lg flex flex-col items-center justify-center w-[62px] h-8 mt-1">
                <img src={helper.supplierImageURL(supplier.avatar)} alt={supplier.fullName} className="max-w-full max-h-full object-contain" />
            </span>
            <a href={`/supplier?c=${supplier._id}`} className="text-primary text-[0.9em] font-medium whitespace-nowrap ml-2 overflow-hidden text-ellipsis w-[200px] hover:text-primary-dark transition-colors">
                {supplier.fullName}
            </a>
        </div>
    )
}

export default SupplierBadge

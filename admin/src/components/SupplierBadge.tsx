import React from 'react'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'

interface SupplierBadgeProps {
    supplier: bookcarsTypes.User
}

const SupplierBadge = ({ supplier }: SupplierBadgeProps) => {
    return supplier && (
        <div className="flex items-center text-black/60 text-[1em] leading-[1em] max-w-[200px]" title={supplier.fullName}>
            <span className="border border-[#e6e6e6] rounded-[3px] flex flex-col items-center justify-center w-[62px] h-8 mt-[5px]">
                <img src={helper.supplierImageURL(supplier.avatar)} alt={supplier.fullName} className="max-w-full max-h-full" />
            </span>
            <a href={`/supplier?c=${supplier._id}`} className="text-[#0064c8] text-[0.9em] whitespace-nowrap ml-[5px] break-words overflow-hidden text-ellipsis w-[200px]">
                {supplier.fullName}
            </a>
        </div>
    )
}

export default SupplierBadge

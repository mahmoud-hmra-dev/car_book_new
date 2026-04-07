import React from 'react'
import { IconButton } from '@mui/material'
import {
  ArrowBackIos as PreviousPageIcon,
  ArrowForwardIos as NextPageIcon
} from '@mui/icons-material'
import { strings as commonStrings } from '@/lang/common'

interface PagerProps {
  page: number
  pageSize: number
  totalRecords: number
  rowCount: number
  onNext: () => void
  onPrevious: () => void
}

const Pager = ({
  page,
  pageSize,
  totalRecords,
  rowCount,
  onNext,
  onPrevious
}: PagerProps) => (
    (((page > 1 || rowCount < totalRecords) && (
      <div className="flex items-center justify-center gap-3 py-6">
        <IconButton
          onClick={onPrevious}
          disabled={page === 1}
          className="!w-9 !h-9 !rounded-lg !text-sm !font-medium hover:!bg-background !text-text-secondary disabled:!opacity-40"
        >
          <PreviousPageIcon className="!w-4 !h-4" />
        </IconButton>

        <span className="text-sm text-text-secondary font-medium px-2">{`${(page - 1) * pageSize + 1}-${rowCount} ${commonStrings.OF} ${totalRecords}`}</span>

        <IconButton
          onClick={onNext}
          disabled={rowCount >= totalRecords}
          className="!w-9 !h-9 !rounded-lg !text-sm !font-medium hover:!bg-background !text-text-secondary disabled:!opacity-40"
        >
          <NextPageIcon className="!w-4 !h-4" />
        </IconButton>
      </div>
    )) || <></>)
  )

export default Pager

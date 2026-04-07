import React from 'react'
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
      <div className="flex items-center justify-center gap-1.5 py-6">
        <button
          type="button"
          onClick={onPrevious}
          disabled={page === 1}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <PreviousPageIcon className="!w-4 !h-4" />
        </button>

        <span className="text-sm text-text-secondary font-medium px-3">
          {`${(page - 1) * pageSize + 1}-${rowCount} ${commonStrings.OF} ${totalRecords}`}
        </span>

        <button
          type="button"
          onClick={onNext}
          disabled={rowCount >= totalRecords}
          className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-muted hover:border-primary hover:text-primary transition-all disabled:opacity-30 disabled:pointer-events-none"
        >
          <NextPageIcon className="!w-4 !h-4" />
        </button>
      </div>
    )) || <></>)
  )

export default Pager

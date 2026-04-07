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
      <div className="h-[54px] w-full py-[5px] pr-2.5 pl-0 mb-[15px] bg-white rounded-[5px] flex flex-row justify-end">
        <div className="flex flex-row items-center">
          <div className="text-sm flex flex-row items-center mr-[7px]">{`${(page - 1) * pageSize + 1}-${rowCount} ${commonStrings.OF} ${totalRecords}`}</div>

          <div className="flex flex-row items-center">
            <IconButton onClick={onPrevious} disabled={page === 1}>
              <PreviousPageIcon className="icon" />
            </IconButton>

            <IconButton onClick={onNext} disabled={rowCount >= totalRecords}>
              <NextPageIcon className="icon" />
            </IconButton>
          </div>
        </div>
      </div>
    )) || <></>)
  )

export default Pager

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material'
import { Inbox as InboxIcon } from '@mui/icons-material'
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/locations'
import * as LocationService from '@/services/LocationService'
import * as helper from '@/utils/helper'
import Pager from './Pager'
import Avatar from './Avatar'
import { UserContextType, useUserContext } from '@/context/UserContext'
import Progress from '@/components/Progress'


interface LocationListProps {
  keyword?: string
  onLoad: bookcarsTypes.DataEvent<bookcarsTypes.Location>
  onDelete: (rowCount: number) => void
}

const LocationList = ({
  keyword: locationKeyword,
  onLoad,
  onDelete
}: LocationListProps) => {
  const navigate = useNavigate()

  const { user } = useUserContext() as UserContextType
  const [keyword, setKeyword] = useState(locationKeyword)
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Location[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)
  const [locationId, setLocationId] = useState('')
  const [locationIndex, setLocationIndex] = useState(-1)

  const fetchData = async (_page: number, _keyword?: string) => {
    try {
      setLoading(true)

      const data = await LocationService.getLocations(_keyword || '', _page, env.PAGE_SIZE)
      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1)
        || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (locationKeyword !== keyword) {
      fetchData(1, locationKeyword)
    }
    setKeyword(locationKeyword || '')
  }, [locationKeyword, keyword]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData(page, keyword)
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch
            && !loading
            && window.scrollY > 0
            && window.scrollY + window.innerHeight + env.INFINITE_SCROLL_OFFSET >= document.body.scrollHeight) {
            setLoading(true)
            setPage(page + 1)
          }
        }
      }
    }
  }, [fetch, loading, page, keyword])

  const handleDelete = async (e: React.MouseEvent<HTMLElement>) => {
    try {
      const _locationId = e.currentTarget.getAttribute('data-id') as string
      const _locationIndex = Number(e.currentTarget.getAttribute('data-index') as string)

      const status = await LocationService.check(_locationId)

      if (status === 204) {
        setOpenDeleteDialog(true)
        setLocationId(_locationId)
        setLocationIndex(_locationIndex)
      } else if (status === 200) {
        setOpenInfoDialog(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCloseInfo = () => {
    setOpenInfoDialog(false)
  }

  const handleConfirmDelete = async () => {
    try {
      if (locationId !== '' && locationIndex > -1) {
        setLoading(true)
        setOpenDeleteDialog(false)

        const status = await LocationService.deleteLocation(locationId)

        if (status === 200) {
          const _rowCount = rowCount - 1

          rows.splice(locationIndex, 1)

          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setLocationId('')
          setLocationIndex(-1)
          setLoading(false)

          if (onDelete) {
            onDelete(_rowCount)
          }
        } else {
          helper.error()
          setLocationId('')
          setLocationIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setOpenDeleteDialog(false)
        setLocationId('')
        setLocationIndex(-1)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setLocationId('')
    setLocationIndex(-1)
  }

  return user && (
    <>
      <section className="space-y-1">
        {rows.length === 0 ? (
          !init
          && !loading
          && (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-border">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <InboxIcon className="text-primary text-2xl" />
              </div>
              <p className="text-sm text-text-muted">{strings.EMPTY_LIST}</p>
            </div>
          )
        ) : (
          <div className="space-y-1">
            {rows.map((location, index) => (
              <article key={location._id} className="bg-white rounded-2xl border border-border p-4 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
                <div className="shrink-0">
                  <Avatar
                    type={bookcarsTypes.RecordType.Location}
                    mode="update"
                    record={location}
                    size="medium"
                    readonly
                    color="disabled"
                    className="!w-10 !h-10 !rounded-lg"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-text text-[15px] truncate">{location.name}</h3>
                  {location.country?.name && (
                    <p className="text-xs text-text-muted mt-1">{location.country.name}</p>
                  )}
                </div>
                {(helper.admin(user) || location.supplier?._id === user._id) && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Tooltip title={commonStrings.UPDATE}>
                      <IconButton onClick={() => navigate(`/update-location?loc=${location._id}`)} className="!w-9 !h-9 !rounded-xl hover:!bg-primary/10 !text-text-muted hover:!text-primary !transition-all">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={commonStrings.DELETE}>
                      <IconButton data-id={location._id} data-index={index} onClick={handleDelete} className="!w-9 !h-9 !rounded-xl hover:!bg-danger/10 !text-text-muted hover:!text-danger !transition-all">
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
        <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
          <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{commonStrings.INFO}</DialogTitle>
          <DialogContent className="!text-sm !text-text-secondary !text-center !px-8">{strings.CANNOT_DELETE_LOCATION}</DialogContent>
          <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
            <button type="button" onClick={handleCloseInfo} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
              {commonStrings.CLOSE}
            </button>
          </DialogActions>
        </Dialog>

        <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
          <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{commonStrings.CONFIRM_TITLE}</DialogTitle>
          <DialogContent className="!text-sm !text-text-secondary !text-center !px-8">{strings.DELETE_LOCATION}</DialogContent>
          <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
            <button type="button" onClick={handleCancelDelete} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
              {commonStrings.CANCEL}
            </button>
            <button type="button" onClick={handleConfirmDelete} className="px-6 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-red-600 transition-colors">
              {commonStrings.DELETE}
            </button>
          </DialogActions>
        </Dialog>

        {loading && <Progress />}
      </section>
      {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
        <Pager
          page={page}
          pageSize={env.PAGE_SIZE}
          rowCount={rowCount}
          totalRecords={totalRecords}
          onNext={() => setPage(page + 1)}
          onPrevious={() => setPage(page - 1)}
        />
      )}
    </>
  )
}

export default LocationList

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DataGrid,
  GridPaginationModel,
  GridColDef,
  GridRowId,
  GridRenderCellParams,
} from '@mui/x-data-grid'
import {
  Tooltip,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon, Check as CheckIcon } from '@mui/icons-material'
import { format } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/booking-list'
import * as helper from '@/utils/helper'
import { getDateFnsLocale } from '@/utils/locale'
import * as BookingService from '@/services/BookingService'
import StatusList from './StatusList'
import BookingStatus from './BookingStatus'


interface BookingListProps {
  suppliers?: string[]
  statuses?: string[]
  filter?: bookcarsTypes.Filter | null
  car?: string
  offset?: number
  user?: bookcarsTypes.User
  loggedUser?: bookcarsTypes.User
  containerClassName?: string
  hideDates?: boolean
  hideCarColumn?: boolean
  hideSupplierColumn?: boolean
  language?: string
  loading?: boolean
  checkboxSelection?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Booking>
}

const BookingList = ({
  suppliers: bookingSuppliers,
  statuses: bookingStatuses,
  filter: bookingFilter,
  car: bookingCar,
  offset: bookingOffset,
  user: bookingUser,
  loggedUser: bookingLoggedUser,
  containerClassName,
  hideDates,
  hideCarColumn,
  hideSupplierColumn,
  language,
  checkboxSelection,
  onLoad,
}: BookingListProps) => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(env.isMobile ? env.BOOKINGS_MOBILE_PAGE_SIZE : env.BOOKINGS_PAGE_SIZE)
  const [columns, setColumns] = useState<GridColDef<bookcarsTypes.Booking>[]>([])
  const [rows, setRows] = useState<bookcarsTypes.Booking[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [fetch, setFetch] = useState(false)
  const [selectedId, setSelectedId] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [suppliers, setSuppliers] = useState<string[] | undefined>(bookingSuppliers)
  const [statuses, setStatuses] = useState<string[] | undefined>(bookingStatuses)
  const [status, setStatus] = useState<bookcarsTypes.BookingStatus>()
  const [filter, setFilter] = useState<bookcarsTypes.Filter | undefined | null>(bookingFilter)
  const [car, setCar] = useState<string>(bookingCar || '')
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false)
  const [openDeleteDialog, setopenDeleteDialog] = useState(false)
  const [offset, setOffset] = useState(0)
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    pageSize: env.BOOKINGS_PAGE_SIZE,
    page: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!env.isMobile) {
      setPage(paginationModel.page)
      setPageSize(paginationModel.pageSize)
    }
  }, [paginationModel])

  const fetchData = async (_page: number, _user?: bookcarsTypes.User, _car?: string) => {
    try {
      const _pageSize = env.isMobile ? env.BOOKINGS_MOBILE_PAGE_SIZE : pageSize

      if (suppliers && statuses) {
        setLoading(true)
        const payload: bookcarsTypes.GetBookingsPayload = {
          suppliers,
          statuses,
          filter: filter || undefined,
          car: _car || car,
          user: (_user && _user._id) || undefined,
        }

        const data = await BookingService.getBookings(
          payload,
          _page + 1,
          _pageSize,
        )
        const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
        if (!_data) {
          helper.error()
          return
        }
        const totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

        if (env.isMobile) {
          const _rows = _page === 0 ? _data.resultData : [...rows, ..._data.resultData]
          setRows(_rows)
          setRowCount(totalRecords)
          setFetch(_data.resultData.length > 0)
          if (onLoad) {
            onLoad({ rows: _data.resultData, rowCount: totalRecords })
          }
        } else {
          setRows(_data.resultData)
          setRowCount(totalRecords)
          if (onLoad) {
            onLoad({ rows: _data.resultData, rowCount: totalRecords })
          }
        }
      } else {
        setRows([])
        setRowCount(0)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
      }
    } catch (err) {
      helper.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setSuppliers(bookingSuppliers)
  }, [bookingSuppliers])

  useEffect(() => {
    setStatuses(bookingStatuses)
  }, [bookingStatuses])

  useEffect(() => {
    setFilter(bookingFilter)
  }, [bookingFilter])

  useEffect(() => {
    setCar(bookingCar || '')

    if (bookingCar) {
      fetchData(page, user, bookingCar)
    }
  }, [bookingCar]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setOffset(bookingOffset || 0)
  }, [bookingOffset])

  useEffect(() => {
    setUser(bookingUser)

    if (bookingUser) {
      fetchData(page, bookingUser, car)
    }
  }, [bookingUser]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suppliers && statuses && loggedUser) {
      fetchData(page, user)
    }
  }, [page]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (suppliers && statuses && loggedUser) {
      if (page === 0) {
        fetchData(0, user)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [pageSize]) // eslint-disable-line react-hooks/exhaustive-deps

  const getDate = (date?: string) => {
    if (date) {
      const d = new Date(date)
      return `${bookcarsHelper.formatDatePart(d.getDate())}-${bookcarsHelper.formatDatePart(d.getMonth() + 1)}-${d.getFullYear()}`
    }

    throw new Error('Invalid date')
  }

  const getColumns = (): GridColDef<bookcarsTypes.Booking>[] => {
    const _columns: GridColDef<bookcarsTypes.Booking>[] = [
      {
        field: 'driver',
        headerName: strings.DRIVER,
        flex: 1,
        renderCell: ({ row, value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => <Link href={`/user?u=${(row.driver as bookcarsTypes.User)._id}`}>{value}</Link>,
        valueGetter: (value: bookcarsTypes.User) => value?.fullName,
      },
      {
        field: 'from',
        headerName: commonStrings.FROM,
        flex: 1,
        valueGetter: (value: string) => getDate(value),
      },
      {
        field: 'to',
        headerName: commonStrings.TO,
        flex: 1,
        valueGetter: (value: string) => getDate(value),
      },
      {
        field: 'price',
        headerName: strings.PRICE,
        flex: 1,
        renderCell: ({ value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => <span className="font-semibold">{value}</span>,
        valueGetter: (value: number) => bookcarsHelper.formatPrice(value, commonStrings.CURRENCY, language as string),
      },
      {
        field: 'status',
        headerName: strings.STATUS,
        flex: 1,
        renderCell: ({ value }: GridRenderCellParams<bookcarsTypes.Booking, bookcarsTypes.BookingStatus>) => <BookingStatus value={value!} showIcon />,
        valueGetter: (value: string) => value,
      },
      {
        field: 'action',
        headerName: '',
        sortable: false,
        disableColumnMenu: true,
        renderCell: ({ row }: GridRenderCellParams<bookcarsTypes.Booking>) => {
          const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
            e.stopPropagation() // don't select this row after clicking
            setSelectedId(row._id || '')
            setopenDeleteDialog(true)
          }

          return (
            <div>
              <Tooltip title={commonStrings.UPDATE}>
                <IconButton onClick={() => navigate(`/update-booking?b=${row._id}`)}>
                  <EditIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title={commonStrings.DELETE}>
                <IconButton onClick={handleDelete}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            </div>
          )
        },
        renderHeader: () => (selectedIds.length > 0 ? (
          <div>
            <Tooltip title={strings.UPDATE_SELECTION}>
              <IconButton
                onClick={() => {
                  setOpenUpdateDialog(true)
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title={strings.DELETE_SELECTION}>
              <IconButton
                onClick={() => {
                  setopenDeleteDialog(true)
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </div>
        ) : (
          <></>
        )),
      },
    ]

    if (hideDates) {
      _columns.splice(1, 2)
    }

    if (!hideCarColumn) {
      _columns.unshift({
        field: 'car',
        headerName: strings.CAR,
        flex: 1,
        renderCell: ({ row, value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => <Link href={`/car?cr=${(row.car as bookcarsTypes.Car)._id}`}>{value}</Link>,
        valueGetter: (value: bookcarsTypes.Car) => value?.name,
      })
    }

    if (helper.admin(loggedUser) && !hideSupplierColumn) {
      _columns.unshift({
        field: 'supplier',
        headerName: commonStrings.SUPPLIER,
        flex: 1,
        renderCell: ({ row, value }: GridRenderCellParams<bookcarsTypes.Booking, string>) => (
          <Link href={`/supplier?c=${(row.supplier as bookcarsTypes.User)._id}`} className="inline-flex relative align-middle w-[60px] h-[30px]">
            <img src={helper.supplierImageURL((row.supplier as bookcarsTypes.User).avatar)} alt={value} className="max-w-full max-h-full" />
          </Link>
        ),
        valueGetter: (value: bookcarsTypes.User) => value?.fullName,
      })
    }

    return _columns
  }

  useEffect(() => {
    if (suppliers && statuses && loggedUser) {
      const _columns = getColumns()
      setColumns(_columns)

      if (page === 0) {
        fetchData(0, user)
      } else {
        const _paginationModel = bookcarsHelper.clone(paginationModel)
        _paginationModel.page = 0
        setPaginationModel(_paginationModel)
      }
    }
  }, [suppliers, statuses, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const _columns = getColumns()
    setColumns(_columns)
  }, [selectedIds]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setLoggedUser(bookingLoggedUser || undefined)
  }, [bookingLoggedUser])

  useEffect(() => {
    if (env.isMobile) {
      const element: HTMLDivElement | null = (containerClassName
        ? document.querySelector(`.${containerClassName}`)
        : document.querySelector('div.bookings'))

      if (element) {
        element.onscroll = (event: Event) => {
          if (fetch && !loading) {
            const target = event.target as HTMLDivElement

            if (
              target.scrollTop > 0
              && target.offsetHeight + target.scrollTop + env.INFINITE_SCROLL_OFFSET >= target.scrollHeight
            ) {
              setLoading(true)
              setPage(page + 1)
            }
          }
        }
      }
    }
  }, [containerClassName, page, fetch, loading, offset])

  const handleCancelUpdate = () => {
    setOpenUpdateDialog(false)
  }

  const handleStatusChange = (_status: bookcarsTypes.BookingStatus) => {
    setStatus(_status)
  }

  const handleConfirmUpdate = async () => {
    try {
      if (!status) {
        helper.error()
        return
      }

      const data: bookcarsTypes.UpdateStatusPayload = { ids: selectedIds, status }

      const _status = await BookingService.updateStatus(data)

      if (_status === 200) {
        rows.forEach((row: bookcarsTypes.Booking) => {
          if (row._id && selectedIds.includes(row._id)) {
            row.status = status
          }
        })
        setRows(bookcarsHelper.clone(rows))
      } else {
        helper.error()
      }

      setOpenUpdateDialog(false)
    } catch (err) {
      helper.error(err)
    }
  }

  const handleDelete = (e: React.MouseEvent<HTMLElement>) => {
    const _selectedId = e.currentTarget.getAttribute('data-id') as string
    const _selectedIndex = Number(e.currentTarget.getAttribute('data-index') as string)

    setSelectedId(_selectedId)
    setSelectedIndex(_selectedIndex)
    setopenDeleteDialog(true)
    setSelectedId(_selectedId)
    setSelectedIndex(_selectedIndex)
  }

  const handleCancelDelete = () => {
    setopenDeleteDialog(false)
    setSelectedId('')
  }

  const handleConfirmDelete = async () => {
    try {
      if (env.isMobile) {
        const ids = [selectedId]

        const _status = await BookingService.deleteBookings(ids)

        if (_status === 200) {
          rows.splice(selectedIndex, 1)
          setRows(rows)
          setSelectedId('')
          setSelectedIndex(-1)
        } else {
          helper.error()
        }

        setopenDeleteDialog(false)
      } else {
        const ids = selectedIds.length > 0 ? selectedIds : [selectedId]

        const _status = await BookingService.deleteBookings(ids)

        if (_status === 200) {
          if (selectedIds.length > 0) {
            setRows(rows.filter((row) => row._id && !selectedIds.includes(row._id)))
          } else {
            setRows(rows.filter((row) => row._id !== selectedId))
          }
        } else {
          helper.error()
        }

        setopenDeleteDialog(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const mobileBadgeMap: Record<string, string> = {
    void: 'bg-border/60 text-text-secondary',
    pending: 'bg-warning/15 text-warning',
    deposit: 'bg-success/15 text-success',
    paid: 'bg-success/15 text-success',
    paidinfull: 'bg-success text-white',
    reserved: 'bg-info/15 text-info',
    cancelled: 'bg-danger/15 text-danger',
  }

  const _fr = language === 'fr'
  const _ar = language === 'ar'
  const _locale = getDateFnsLocale(language)
  const _format = _fr ? 'eee d LLL yyyy kk:mm' : _ar ? 'eee، d LLL yyyy، p' : 'eee, d LLL yyyy, p'
  const bookingDetailHeight = env.SUPPLIER_IMAGE_HEIGHT + 10

  return (
    <div className="flex flex-col items-center flex-1-0-auto max-md:w-full max-md:max-w-[520px] max-md:px-2 md:absolute md:inset-0 md:overflow-y-auto">
      {loggedUser
        && (env.isMobile ? (
          <>
            {rows.map((booking, index) => {
              const from = new Date(booking.from)
              const to = new Date(booking.to)
              const days = bookcarsHelper.days(from, to)

              return (
                <div key={booking._id} className="bg-white rounded-xl border border-border p-5 mb-3 w-full hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-center mb-4">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${mobileBadgeMap[booking.status.toLowerCase()] || ''}`}>
                      {helper.getBookingStatus(booking.status)}
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{strings.CAR}</span>
                      <Link href={`car/?cr=${(booking.car as bookcarsTypes.Car)._id}`} className="text-sm text-primary font-medium">{(booking.car as bookcarsTypes.Car).name}</Link>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{strings.DRIVER}</span>
                      <Link href={`user/?u=${(booking.driver as bookcarsTypes.User)._id}`} className="text-sm text-primary font-medium">{(booking.driver as bookcarsTypes.User).fullName}</Link>
                    </div>
                    <div className="flex flex-col py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">{strings.DAYS}</span>
                      <span className="text-sm text-text-secondary">
                        {`${helper.getDaysShort(bookcarsHelper.days(from, to))} (${bookcarsHelper.capitalize(
                          format(from, _format, { locale: _locale }),
                        )} - ${bookcarsHelper.capitalize(format(to, _format, { locale: _locale }))})`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.PICK_UP_LOCATION}</span>
                      <span className="text-sm text-text-secondary">{(booking.pickupLocation as bookcarsTypes.Location).name}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.DROP_OFF_LOCATION}</span>
                      <span className="text-sm text-text-secondary">{(booking.dropOffLocation as bookcarsTypes.Location).name}</span>
                    </div>
                    <div className="flex items-center justify-between py-1.5 border-b border-border/50">
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.SUPPLIER}</span>
                      <div className="flex items-center gap-2">
                        <img src={helper.supplierImageURL((booking.supplier as bookcarsTypes.User).avatar)} alt={(booking.supplier as bookcarsTypes.User).fullName} className="max-w-[50px] max-h-[24px] object-contain" />
                        <span className="text-sm text-text-secondary">{(booking.supplier as bookcarsTypes.User).fullName}</span>
                      </div>
                    </div>
                  </div>

                  {(booking.cancellation || booking.amendments || booking.collisionDamageWaiver || booking.theftProtection || booking.fullInsurance || booking.additionalDriver) && (
                    <>
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{commonStrings.OPTIONS}</span>
                        <div className="mt-2 space-y-1.5">
                          {booking.cancellation && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.CANCELLATION}</span>
                              <span className="text-xs text-text-muted">{helper.getCancellationOption((booking.car as bookcarsTypes.Car).cancellation, language as string, true)}</span>
                            </div>
                          )}

                          {booking.amendments && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.AMENDMENTS}</span>
                              <span className="text-xs text-text-muted">{helper.getAmendmentsOption((booking.car as bookcarsTypes.Car).amendments, language as string, true)}</span>
                            </div>
                          )}

                          {booking.collisionDamageWaiver && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.COLLISION_DAMAGE_WAVER}</span>
                              <span className="text-xs text-text-muted">{helper.getCollisionDamageWaiverOption((booking.car as bookcarsTypes.Car).collisionDamageWaiver, days, language as string, true)}</span>
                            </div>
                          )}

                          {booking.theftProtection && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.THEFT_PROTECTION}</span>
                              <span className="text-xs text-text-muted">{helper.getTheftProtectionOption((booking.car as bookcarsTypes.Car).theftProtection, days, language as string, true)}</span>
                            </div>
                          )}

                          {booking.fullInsurance && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.FULL_INSURANCE}</span>
                              <span className="text-xs text-text-muted">{helper.getFullInsuranceOption((booking.car as bookcarsTypes.Car).fullInsurance, days, language as string, true)}</span>
                            </div>
                          )}

                          {booking.additionalDriver && (
                            <div className="flex items-center gap-2">
                              <CheckIcon className="text-success !w-4 !h-4" />
                              <span className="text-[13px] font-semibold text-text">{csStrings.ADDITIONAL_DRIVER}</span>
                              <span className="text-xs text-text-muted">{helper.getAdditionalDriverOption((booking.car as bookcarsTypes.Car).additionalDriver, days, language as string, true)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <div>
                      <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">{strings.COST}</span>
                      <div className="text-lg font-bold text-primary">{bookcarsHelper.formatPrice(booking.price as number, commonStrings.CURRENCY, language as string)}</div>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      type="button"
                      className="bg-primary text-white flex-1 rounded-xl py-2.5 font-semibold text-sm hover:bg-primary-dark transition-colors"
                      onClick={() => navigate(`/update-booking?b=${booking._id}`)}
                    >
                      {commonStrings.UPDATE}
                    </button>
                    <button
                      type="button"
                      className="border border-border text-text-secondary flex-1 rounded-xl py-2.5 font-semibold text-sm hover:border-danger hover:text-danger transition-colors"
                      data-id={booking._id}
                      data-index={index}
                      onClick={handleDelete}
                    >
                      {commonStrings.DELETE}
                    </button>
                  </div>
                </div>
              )
            })}
          </>
        ) : (
          <DataGrid
            checkboxSelection={checkboxSelection}
            getRowId={(row: bookcarsTypes.Booking): GridRowId => row._id as GridRowId}
            columns={columns}
            rows={rows}
            rowCount={rowCount}
            loading={loading}
            initialState={{
              pagination: {
                paginationModel: { pageSize: env.BOOKINGS_PAGE_SIZE },
              },
            }}
            pageSizeOptions={[env.BOOKINGS_PAGE_SIZE, 50, 100]}
            pagination
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            onRowSelectionModelChange={(_selectedIds) => {
              if (_selectedIds.type === 'exclude' && _selectedIds.ids.size === 0) {
                _selectedIds = { type: 'include', ids: new Set(rows.map((row) => row._id as GridRowId)) }
              }
              setSelectedIds(Array.from(new Set(_selectedIds.ids)).map((id) => id.toString()))
            }}
            disableRowSelectionOnClick
            className="w-full"
          />
        ))}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openUpdateDialog}>
        <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{strings.UPDATE_STATUS}</DialogTitle>
        <DialogContent className="w-[444px] h-[70px] overflow-hidden">
          <StatusList label={strings.NEW_STATUS} onChange={handleStatusChange} />
        </DialogContent>
        <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
          <button type="button" onClick={handleCancelUpdate} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
            {commonStrings.CANCEL}
          </button>
          <button type="button" onClick={handleConfirmUpdate} className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition-colors">
            {commonStrings.UPDATE}
          </button>
        </DialogActions>
      </Dialog>

      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent className="!text-sm !text-text-secondary !text-center !px-8">{selectedIds.length === 0 ? strings.DELETE_BOOKING : strings.DELETE_BOOKINGS}</DialogContent>
        <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
          <button type="button" onClick={handleCancelDelete} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
            {commonStrings.CANCEL}
          </button>
          <button type="button" onClick={handleConfirmDelete} className="px-6 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            {commonStrings.DELETE}
          </button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default BookingList

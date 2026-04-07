import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material'
import {
  LocalGasStation as CarTypeIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import Const from '@/config/const'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import * as helper from '@/utils/helper'
import * as CarService from '@/services/CarService'
import Pager from '@/components/Pager'
import Progress from '@/components/Progress'

import DoorsIcon from '@/assets/img/car-door.png'
import RatingIcon from '@/assets/img/rating-icon.png'
import CO2MinIcon from '@/assets/img/co2-min-icon.png'
import CO2MiddleIcon from '@/assets/img/co2-middle-icon.png'
import CO2MaxIcon from '@/assets/img/co2-max-icon.png'


interface CarListProps {
  suppliers?: string[]
  keyword?: string
  carSpecs?: bookcarsTypes.CarSpecs
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[],
  deposit?: number
  availability?: string[]
  reload?: boolean
  cars?: bookcarsTypes.Car[]
  user?: bookcarsTypes.User
  booking?: bookcarsTypes.Booking
  className?: string
  loading?: boolean
  hideSupplier?: boolean
  hidePrice?: boolean
  language?: string
  range?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
  onDelete?: (rowCount: number) => void
}

const CarList = ({
  suppliers: carSuppliers,
  keyword: carKeyword,
  carSpecs: _carSpecs,
  carType: _carType,
  gearbox: carGearbox,
  mileage: carMileage,
  fuelPolicy: _fuelPolicy,
  deposit: carDeposit,
  availability: carAvailability,
  reload,
  cars,
  user: carUser,
  booking,
  className,
  loading: carLoading,
  hideSupplier,
  hidePrice,
  language,
  range,
  multimedia,
  rating,
  seats,
  onLoad,
  onDelete
}: CarListProps) => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [page, setPage] = useState(1)
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [carId, setCarId] = useState('')
  const [carIndex, setCarIndex] = useState(-1)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)

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
  }, [fetch, loading, page])

  const fetchData = async (
    _page: number,
    suppliers?: string[],
    keyword?: string,
    carSpecs?: bookcarsTypes.CarSpecs,
    __carType?: string[],
    gearbox?: string[],
    mileage?: string[],
    fuelPolicy?: string[],
    deposit?: number,
    availability?: string[],
    _range?: string[],
    _multimedia?: string[],
    _rating?: number,
    _seats?: number,
  ) => {
    try {
      setLoading(true)

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: suppliers ?? [],
        carSpecs,
        carType: __carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        availability,
        ranges: _range,
        multimedia: _multimedia,
        rating: _rating,
        seats: _seats,
      }
      const data = await CarService.getCars(keyword || '', payload, _page, env.CARS_PAGE_SIZE)

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
      if (!_data) {
        helper.error()
        return
      }
      const _totalRecords = Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0 ? _data.pageInfo[0].totalRecords : 0

      let _rows: bookcarsTypes.Car[] = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
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
    if (carSuppliers) {
      if (carSuppliers.length > 0) {
        fetchData(
          page,
          carSuppliers,
          carKeyword,
          _carSpecs,
          _carType,
          carGearbox,
          carMileage,
          _fuelPolicy,
          carDeposit || 0,
          carAvailability,
          range,
          multimedia,
          rating,
          seats
        )
      } else {
        setRows([])
        setRowCount(0)
        setFetch(false)
        if (onLoad) {
          onLoad({ rows: [], rowCount: 0 })
        }
        setInit(false)
      }
    }
  }, [page, carSuppliers, carKeyword, _carSpecs, _carType, carGearbox, carMileage, _fuelPolicy, carDeposit, carAvailability, range, multimedia, rating, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cars) {
      setRows(cars)
      setRowCount(cars.length)
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: cars, rowCount: cars.length })
      }
      // setLoading(false)
    }
  }, [cars]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [
    carSuppliers,
    carKeyword,
    _carSpecs,
    _carType,
    carGearbox,
    carMileage,
    _fuelPolicy,
    carDeposit,
    carAvailability,
    range,
    multimedia,
    rating,
    seats,
  ])

  useEffect(() => {
    if (reload) {
      setPage(1)
      fetchData(
        1,
        carSuppliers,
        carKeyword,
        _carSpecs,
        _carType,
        carGearbox,
        carMileage,
        _fuelPolicy,
        carDeposit,
        carAvailability,
        range,
        multimedia,
        rating,
        seats,
      )
    }
  }, [reload, carSuppliers, carKeyword, _carSpecs, _carType, carGearbox, carMileage, _fuelPolicy, carDeposit, carAvailability, range, multimedia, rating, seats,]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setUser(carUser)
  }, [carUser])

  const handleDelete = async (e: React.MouseEvent<HTMLElement>) => {
    try {
      const _carId = e.currentTarget.getAttribute('data-id') as string
      const _carIndex = Number(e.currentTarget.getAttribute('data-index') as string)

      const status = await CarService.check(_carId)

      if (status === 200) {
        setOpenInfoDialog(true)
      } else if (status === 204) {
        setOpenDeleteDialog(true)
        setCarId(_carId)
        setCarIndex(_carIndex)
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
      if (carId !== '' && carIndex > -1) {
        setOpenDeleteDialog(false)

        const status = await CarService.deleteCar(carId)

        if (status === 200) {
          const _rowCount = rowCount - 1
          rows.splice(carIndex, 1)
          setRows(rows)
          setRowCount(_rowCount)
          setTotalRecords(totalRecords - 1)
          setCarId('')
          setCarIndex(-1)
          if (onDelete) {
            onDelete(_rowCount)
          }
          setLoading(false)
        } else {
          helper.error()
          setCarId('')
          setCarIndex(-1)
          setLoading(false)
        }
      } else {
        helper.error()
        setCarId('')
        setCarIndex(-1)
        setOpenDeleteDialog(false)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
    setCarId('')
  }

  const getExtraIcon = (option: string, extra: number) => {
    let available = false
    if (booking) {
      if (option === 'cancellation' && booking.cancellation && extra > 0) {
        available = true
      }
      if (option === 'amendments' && booking.amendments && extra > 0) {
        available = true
      }
      if (option === 'collisionDamageWaiver' && booking.collisionDamageWaiver && extra > 0) {
        available = true
      }
      if (option === 'theftProtection' && booking.theftProtection && extra > 0) {
        available = true
      }
      if (option === 'fullInsurance' && booking.fullInsurance && extra > 0) {
        available = true
      }
      if (option === 'additionalDriver' && booking.additionalDriver && extra > 0) {
        available = true
      }
    }

    return extra === -1
      ? <UncheckIcon className="!text-sm text-danger" />
      : extra === 0 || available
        ? <CheckIcon className="!text-sm text-success" />
        : <InfoIcon className="!text-sm text-info" />
  }

  const admin = helper.admin(user)
  const fr = bookcarsHelper.isFrench(language)

  return (
    (user && (
      <>
        <section className={`${className ? `${className} ` : ''}grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5`}>
          {rows.length === 0
            ? !init
            && !loading
            && !carLoading
            && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-border">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <InfoIcon className="text-primary text-2xl" />
                </div>
                <p className="text-sm text-text-muted">{strings.EMPTY_LIST}</p>
              </div>
            )
            : rows.map((car, index) => {
              const edit = admin || car.supplier._id === user._id
              return (
                <article key={car._id} className="bg-white rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-all duration-200 group">
                  {/* Top section: Image + overlays */}
                  <div className="relative">
                    <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden">
                      <img src={helper.carImageURL(car.image)} alt={car.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>

                    {/* Status badges overlay */}
                    {edit && (
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {car.available ? (
                          <Tooltip title={strings.CAR_AVAILABLE_TOOLTIP}>
                            <span className="px-2.5 py-1 rounded-lg bg-success/90 text-white text-[11px] font-bold backdrop-blur-sm">{strings.CAR_AVAILABLE}</span>
                          </Tooltip>
                        ) : (
                          <Tooltip title={strings.CAR_UNAVAILABLE_TOOLTIP}>
                            <span className="px-2.5 py-1 rounded-lg bg-danger/90 text-white text-[11px] font-bold backdrop-blur-sm">{strings.CAR_UNAVAILABLE}</span>
                          </Tooltip>
                        )}
                        {car.comingSoon && (
                          <span className="px-2.5 py-1 rounded-lg bg-info/90 text-white text-[11px] font-bold backdrop-blur-sm">{strings.COMING_SOON}</span>
                        )}
                        {car.fullyBooked && (
                          <span className="px-2.5 py-1 rounded-lg bg-warning/90 text-white text-[11px] font-bold backdrop-blur-sm">{strings.FULLY_BOOKED}</span>
                        )}
                      </div>
                    )}

                    {/* Rating badge */}
                    {car.rating && car.rating >= 1 && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm">
                        <img alt="Rating" src={RatingIcon} className="w-4 h-4" />
                        <span className="text-xs font-bold text-text">{car.rating.toFixed(2)}</span>
                        {car.trips >= 10 && <span className="text-[10px] text-text-muted ml-0.5">{`(${car.trips} ${strings.TRIPS})`}</span>}
                      </div>
                    )}

                    {/* CO2 badge */}
                    {car.co2 && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-lg bg-white/90 backdrop-blur-sm shadow-sm">
                        <img
                          alt="CO2 Effect"
                          className="w-4 h-4"
                          src={
                            car.co2 <= 90
                              ? CO2MinIcon
                              : car.co2 <= 110
                                ? CO2MiddleIcon
                                : CO2MaxIcon
                          }
                        />
                        <span className="text-[10px] font-semibold text-text-secondary">{strings.CO2}</span>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    {/* Supplier badge */}
                    {!hideSupplier && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="border border-border rounded-md flex items-center justify-center w-[52px] h-7 shrink-0">
                          <img src={helper.supplierImageURL(car.supplier.avatar)} alt={car.supplier.fullName} className="max-w-full max-h-full object-contain" />
                        </span>
                        <a href={`/supplier?c=${car.supplier._id}`} className="text-xs text-text-muted font-medium truncate hover:text-primary transition-colors">
                          {car.supplier.fullName}
                        </a>
                      </div>
                    )}

                    {/* Name + Price row */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-text truncate">{car.name}</h3>
                        {car.licensePlate && <p className="text-xs text-text-muted mt-0.5">{car.licensePlate}</p>}
                      </div>
                      {!hidePrice && (
                        <div className="shrink-0 text-right">
                          <div className="text-lg font-bold text-primary">{bookcarsHelper.formatPrice(car.dailyPrice, commonStrings.CURRENCY, language as string)}</div>
                          <div className="text-[10px] text-text-muted">{commonStrings.DAILY}</div>
                        </div>
                      )}
                    </div>

                    {/* Specs chips */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {car.type !== bookcarsTypes.CarType.Unknown && (
                        <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background text-[11px] text-text-secondary font-medium">
                            <CarTypeIcon className="!text-sm" />
                            {helper.getCarTypeShort(car.type)}
                          </span>
                        </Tooltip>
                      )}
                      <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background text-[11px] text-text-secondary font-medium">
                          <GearboxIcon className="!text-sm" />
                          {helper.getGearboxTypeShort(car.gearbox)}
                        </span>
                      </Tooltip>
                      {car.seats > 0 && (
                        <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background text-[11px] text-text-secondary font-medium">
                            <SeatsIcon className="!text-sm" />
                            {car.seats}
                          </span>
                        </Tooltip>
                      )}
                      {car.doors > 0 && (
                        <Tooltip title={helper.getDoorsTooltip(car.doors)} placement="top">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background text-[11px] text-text-secondary font-medium">
                            <img src={DoorsIcon} alt="" className="w-3.5 h-3.5" />
                            {car.doors}
                          </span>
                        </Tooltip>
                      )}
                      {car.aircon && (
                        <Tooltip title={strings.AIRCON_TOOLTIP} placement="top">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background text-[11px] text-text-secondary font-medium">
                            <AirconIcon className="!text-sm" />
                            AC
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {/* Extras/Features */}
                    <div className="space-y-1.5 mb-4 text-xs text-text-secondary">
                      {car.mileage !== 0 && (
                        <Tooltip title={helper.getMileageTooltip(car.mileage, language as string)} placement="left">
                          <div className="flex items-center gap-2">
                            <MileageIcon className="!text-sm text-text-muted" />
                            <span>{`${strings.MILEAGE}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage, language as string)}`}</span>
                          </div>
                        </Tooltip>
                      )}
                      <Tooltip title={helper.getFuelPolicyTooltip(car.fuelPolicy)} placement="left">
                        <div className="flex items-center gap-2">
                          <CarTypeIcon className="!text-sm text-text-muted" />
                          <span>{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                        </div>
                      </Tooltip>
                      <div className="flex items-center gap-2">
                        <InfoIcon className="!text-sm text-text-muted" />
                        <span>{`${strings.DEPOSIT}: ${bookcarsHelper.formatPrice(car.deposit, commonStrings.CURRENCY, language as string)}`}</span>
                      </div>
                    </div>

                    {/* Insurance extras as small badges */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {car.cancellation > -1 && (
                        <Tooltip title={booking ? '' : car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : helper.getCancellation(car.cancellation, language as string)} placement="left">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.cancellation === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('cancellation', car.cancellation)}
                            {helper.getCancellation(car.cancellation, language as string)}
                          </span>
                        </Tooltip>
                      )}
                      {car.amendments > -1 && (
                        <Tooltip title={booking ? '' : car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : helper.getAmendments(car.amendments, language as string)} placement="left">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.amendments === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('amendments', car.amendments)}
                            {helper.getAmendments(car.amendments, language as string)}
                          </span>
                        </Tooltip>
                      )}
                      {car.theftProtection > -1 && (
                        <Tooltip title={booking ? '' : car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : helper.getTheftProtection(car.theftProtection, language as string)} placement="left">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.theftProtection === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('theftProtection', car.theftProtection)}
                            {helper.getTheftProtection(car.theftProtection, language as string)}
                          </span>
                        </Tooltip>
                      )}
                      {car.collisionDamageWaiver > -1 && (
                        <Tooltip
                          title={booking ? '' : car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language as string)}
                          placement="left"
                        >
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.collisionDamageWaiver === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('collisionDamageWaiver', car.collisionDamageWaiver)}
                            {helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language as string)}
                          </span>
                        </Tooltip>
                      )}
                      {car.fullInsurance > -1 && (
                        <Tooltip title={booking ? '' : car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : helper.getFullInsurance(car.fullInsurance, language as string)} placement="left">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.fullInsurance === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('fullInsurance', car.fullInsurance)}
                            {helper.getFullInsurance(car.fullInsurance, language as string)}
                          </span>
                        </Tooltip>
                      )}
                      {car.additionalDriver > -1 && (
                        <Tooltip title={booking ? '' : helper.getAdditionalDriver(car.additionalDriver, language as string)} placement="left">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${car.additionalDriver === 0 ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'}`}>
                            {getExtraIcon('additionalDriver', car.additionalDriver)}
                            {helper.getAdditionalDriver(car.additionalDriver, language as string)}
                          </span>
                        </Tooltip>
                      )}
                    </div>

                    {/* Actions */}
                    {edit && (
                      <div className="flex items-center gap-2 pt-3 border-t border-border">
                        <Tooltip title={strings.VIEW_CAR}>
                          <button
                            type="button"
                            onClick={() => navigate(`/car?cr=${car._id}`)}
                            className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-background hover:text-primary transition-all flex items-center justify-center gap-1.5"
                          >
                            <ViewIcon className="!text-base" />
                            {strings.VIEW_CAR}
                          </button>
                        </Tooltip>
                        <Tooltip title={commonStrings.UPDATE}>
                          <button
                            type="button"
                            onClick={() => navigate(`/update-car?cr=${car._id}`)}
                            className="flex-1 h-9 rounded-lg border border-border text-xs font-semibold text-text-secondary hover:bg-background hover:text-primary transition-all flex items-center justify-center gap-1.5"
                          >
                            <EditIcon className="!text-base" />
                            {commonStrings.UPDATE}
                          </button>
                        </Tooltip>
                        <Tooltip title={commonStrings.DELETE}>
                          <button
                            type="button"
                            data-id={car._id}
                            data-index={index}
                            onClick={handleDelete}
                            className="h-9 w-9 rounded-lg border border-border text-text-muted hover:bg-danger/10 hover:text-danger hover:border-danger/30 transition-all flex items-center justify-center shrink-0"
                          >
                            <DeleteIcon className="!text-base" />
                          </button>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
        </section>

        {loading && <Progress />}

        <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
          <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{commonStrings.INFO}</DialogTitle>
          <DialogContent className="!text-sm !text-text-secondary !text-center !px-8">{strings.CANNOT_DELETE_CAR}</DialogContent>
          <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
            <button type="button" onClick={handleCloseInfo} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
              {commonStrings.CLOSE}
            </button>
          </DialogActions>
        </Dialog>

        <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
          <DialogTitle className="!text-center !text-lg !font-bold !text-text !pt-8">{commonStrings.CONFIRM_TITLE}</DialogTitle>
          <DialogContent className="!text-sm !text-text-secondary !text-center !px-8">{strings.DELETE_CAR}</DialogContent>
          <DialogActions className="!justify-center !gap-3 !pb-8 !px-8">
            <button type="button" onClick={handleCancelDelete} className="px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-text-secondary hover:bg-background transition-colors">
              {commonStrings.CANCEL}
            </button>
            <button type="button" onClick={handleConfirmDelete} className="px-6 py-2.5 rounded-xl bg-danger text-white text-sm font-semibold hover:bg-red-600 transition-colors">
              {commonStrings.DELETE}
            </button>
          </DialogActions>
        </Dialog>

        {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
          <Pager
            page={page}
            pageSize={env.CARS_PAGE_SIZE}
            rowCount={rowCount}
            totalRecords={totalRecords}
            onNext={() => setPage(page + 1)}
            onPrevious={() => setPage(page - 1)}
          />
        )}
      </>
    )) || <></>
  )
}

export default CarList

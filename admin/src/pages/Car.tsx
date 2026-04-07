import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Button,
} from '@mui/material'
import {
  LocalGasStation as FuelIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import * as UserService from '@/services/UserService'
import * as CarService from '@/services/CarService'
import * as SupplierService from '@/services/SupplierService'
import Backdrop from '@/components/SimpleBackdrop'
import NoMatch from './NoMatch'
import Error from './Error'
import Avatar from '@/components/Avatar'
import BookingList from '@/components/BookingList'
import * as helper from '@/utils/helper'

import DoorsIcon from '@/assets/img/car-door.png'
const Car = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [car, setCar] = useState<bookcarsTypes.Car>()
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [offset, setOffset] = useState(0)
  const [openInfoDialog, setOpenInfoDialog] = useState(false)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)
  const [tracking, setTracking] = useState<bookcarsTypes.CarTrackingSnapshot>()

  useEffect(() => {
    if (visible) {
      const col1 = document.querySelector('.car-detail-sidebar')
      if (col1) {
        setOffset(col1.clientHeight)
      }
    }
  }, [visible])

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = () => {
    setLoading(false)
  }

  const handleCloseInfo = () => {
    setOpenInfoDialog(false)
  }

  const handleDelete = async () => {
    try {
      if (car) {
        const status = await CarService.check(car._id)

        if (status === 200) {
          setOpenInfoDialog(true)
        } else if (status === 204) {
          setOpenDeleteDialog(true)
        } else {
          helper.error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const handleConfirmDelete = async () => {
    try {
      if (car) {
        setOpenDeleteDialog(false)

        const status = await CarService.deleteCar(car._id)

        if (status === 200) {
          window.location.href = '/cars'
        } else {
          helper.error()
          setLoading(false)
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setLoading(true)
    setUser(_user)
    setLanguage(UserService.getLanguage())

    const params = new URLSearchParams(window.location.search)
    if (_user && _user.verified && params.has('cr')) {
      const id = params.get('cr')
      if (id && id !== '') {
        try {
          const _car = await CarService.getCar(id)

          if (_car) {
            if (_user.type === bookcarsTypes.RecordType.Admin) {
              try {
                const _suppliers = await SupplierService.getAllSuppliers()
                const supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
                setSuppliers(supplierIds)
                setCar(_car)
                if (_car.tracking?.enabled) {
                  try {
                    setTracking(await CarService.getTracking(_car._id))
                  } catch {
                    setTracking(undefined)
                  }
                }
                setVisible(true)
                setLoading(false)
              } catch (err) {
                helper.error(err)
              }
            } else if (_car.supplier._id === _user._id) {
              setSuppliers([_user._id as string])
              setCar(_car)
              if (_car.tracking?.enabled) {
                try {
                  setTracking(await CarService.getTracking(_car._id))
                } catch {
                  setTracking(undefined)
                }
              }
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } else {
            setLoading(false)
            setNoMatch(true)
          }
        } catch {
          setLoading(false)
          setError(true)
          setVisible(false)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    } else {
      setLoading(false)
      setNoMatch(true)
    }
  }

  const edit = user && car && car.supplier && (user.type === bookcarsTypes.RecordType.Admin || user._id === car.supplier._id)
  const statuses = helper.getBookingStatuses().map((status) => status.value)
  const fr = (user && user.language === 'fr') || false

  return (
    <Layout onLoad={onLoad} strict>
      {visible && car && car.supplier && (
        <div className="absolute bottom-0 right-0 left-0 top-0 overflow-auto">
          <div className="car-detail-sidebar max-md:w-full max-md:pt-1.5 max-md:bg-white max-md:border-b max-md:border-border md:absolute md:top-0 md:bottom-0 md:left-0 md:w-[400px] md:pt-5 md:bg-white md:border-r md:border-border md:overflow-auto">
            <section className="text-text text-xs p-1.5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-text">{car.name}</h2>
              </div>
              {car.licensePlate && <div className="text-sm text-text-secondary">{car.licensePlate}</div>}
              <div className="flex flex-col items-center my-4">
                <Avatar
                  type={bookcarsTypes.RecordType.Car}
                  mode="update"
                  record={car}
                  size="large"
                  readonly={!edit}
                  hideDelete
                  onBeforeUpload={handleBeforeUpload}
                  onChange={handleImageChange}
                  color="disabled"
                  className="rounded-xl overflow-hidden"
                />
                <div className="flex items-center mt-2">
                  <span className="w-[60px] h-[30px] flex flex-row items-center justify-center border border-border rounded">
                    <img src={helper.supplierImageURL(car.supplier.avatar)} alt={car.supplier.fullName} className="max-w-full max-h-full" />
                  </span>
                  <span className="text-text-muted inline-block text-sm leading-tight whitespace-nowrap ml-1.5">{car.supplier.fullName}</span>
                </div>
              </div>
              <div className="text-right text-text text-xl font-bold whitespace-nowrap mr-2.5">{`${bookcarsHelper.formatPrice(car.dailyPrice, commonStrings.CURRENCY, language)}${commonStrings.DAILY}`}</div>
              <div className="mt-1.5">
                <ul className="relative list-none p-0 flex flex-row flex-wrap">
                  <li className="w-[60px] mb-2.5 pt-1 shadow-[0_0_0_1px_var(--color-border)_inset] ml-1.5 rounded-lg text-center">
                    <Tooltip title={helper.getCarTypeTooltip(car.type)} placement="top">
                      <div className="flex items-center justify-center gap-0.5 p-1">
                        <FuelIcon className="!text-base text-text-secondary" />
                        <span className="align-super ml-0.5 text-xs text-text">{helper.getCarTypeShort(car.type)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="w-[60px] mb-2.5 pt-1 shadow-[0_0_0_1px_var(--color-border)_inset] ml-1.5 rounded-lg text-center">
                    <Tooltip title={helper.getGearboxTooltip(car.gearbox)} placement="top">
                      <div className="flex items-center justify-center gap-0.5 p-1">
                        <GearboxIcon className="!text-base text-text-secondary" />
                        <span className="align-super ml-0.5 text-xs text-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="w-[60px] mb-2.5 pt-1 shadow-[0_0_0_1px_var(--color-border)_inset] ml-1.5 rounded-lg text-center">
                    <Tooltip title={helper.getSeatsTooltip(car.seats)} placement="top">
                      <div className="flex items-center justify-center gap-0.5 p-1">
                        <SeatsIcon className="!text-base text-text-secondary" />
                        <span className="align-super ml-0.5 text-xs text-text">{car.seats}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="w-[60px] mb-2.5 pt-1 shadow-[0_0_0_1px_var(--color-border)_inset] ml-1.5 rounded-lg text-center">
                    <Tooltip title={helper.getDoorsTooltip(car.doors)} placement="top">
                      <div className="flex items-center justify-center gap-0.5 p-1">
                        <img src={DoorsIcon} alt="" className="w-5 h-5 m-0.5" />
                        <span className="align-super ml-0.5 text-xs text-text">{car.doors}</span>
                      </div>
                    </Tooltip>
                  </li>
                  {car.aircon && (
                    <li className="w-[60px] mb-2.5 pt-1 shadow-[0_0_0_1px_var(--color-border)_inset] ml-1.5 rounded-lg text-center">
                      <Tooltip title={strings.AIRCON_TOOLTIP} placement="top">
                        <div className="flex items-center justify-center gap-0.5 p-1">
                          <AirconIcon className="!text-base text-text-secondary" />
                        </div>
                      </Tooltip>
                    </li>
                  )}
                  <li className="w-full mb-1.5">
                    <Tooltip title={helper.getMileageTooltip(car.mileage, language)} placement="left">
                      <div className="flex items-center gap-1 w-fit p-1">
                        <MileageIcon className="!text-base text-text-secondary" />
                        <span className="text-xs text-text">{`${strings.MILEAGE}${fr ? ' : ' : ': '}${helper.getMileage(car.mileage, language)}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li className="w-full mb-1.5">
                    <Tooltip title={helper.getFuelPolicyTooltip(car.fuelPolicy)} placement="left">
                      <div className="flex items-center gap-1 w-fit p-1">
                        <FuelIcon className="!text-base text-text-secondary" />
                        <span className="text-xs text-text">{`${strings.FUEL_POLICY}${fr ? ' : ' : ': '}${helper.getFuelPolicy(car.fuelPolicy)}`}</span>
                      </div>
                    </Tooltip>
                  </li>
                </ul>
                <ul className="relative list-none p-0">
                  <li className={`m-1.5 w-fit ${car.available ? 'text-success' : 'text-danger'}`}>
                    <Tooltip title={car.available ? strings.CAR_AVAILABLE_TOOLTIP : strings.CAR_UNAVAILABLE_TOOLTIP}>
                      <div className="flex items-center gap-1 p-1">
                        {car.available ? <CheckIcon className="!text-base" /> : <UncheckIcon className="!text-base" />}
                        {car.available ? <span className="text-xs">{strings.CAR_AVAILABLE}</span> : <span className="text-xs">{strings.CAR_UNAVAILABLE}</span>}
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={car.cancellation > -1 ? strings.CANCELLATION_TOOLTIP : helper.getCancellation(car.cancellation, language)} placement="left">
                      <div className="flex items-center gap-1 p-1">
                        {car.cancellation > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getCancellation(car.cancellation, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={car.amendments > -1 ? strings.AMENDMENTS_TOOLTIP : helper.getAmendments(car.amendments, language)} placement="left">
                      <div className="flex items-center gap-1 p-1">
                        {car.amendments > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getAmendments(car.amendments, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={car.theftProtection > -1 ? strings.THEFT_PROTECTION_TOOLTIP : helper.getTheftProtection(car.theftProtection, language)} placement="left">
                      <div className="flex items-center gap-1 p-1">
                        {car.theftProtection > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getTheftProtection(car.theftProtection, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip
                      title={car.collisionDamageWaiver > -1 ? strings.COLLISION_DAMAGE_WAVER_TOOLTIP : helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language)}
                      placement="left"
                    >
                      <div className="flex items-center gap-1 p-1">
                        {car.collisionDamageWaiver > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={car.fullInsurance > -1 ? strings.FULL_INSURANCE_TOOLTIP : helper.getFullInsurance(car.fullInsurance, language)} placement="left">
                      <div className="flex items-center gap-1 p-1">
                        {car.fullInsurance > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getFullInsurance(car.fullInsurance, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                  <li>
                    <Tooltip title={helper.getAdditionalDriver(car.additionalDriver, language)} placement="left">
                      <div className="flex items-center gap-1 p-1">
                        {car.additionalDriver > -1 ? <CheckIcon className="!text-base text-success" /> : <UncheckIcon className="!text-base text-danger" />}
                        <span className="text-xs text-text">{helper.getAdditionalDriver(car.additionalDriver, language)}</span>
                      </div>
                    </Tooltip>
                  </li>
                </ul>
                <ul className="relative list-none p-0">
                  {car.locations.map((location) => (
                    <li key={location._id} className="m-1.5 w-fit">
                      <div className="flex items-center gap-1 p-1">
                        <LocationIcon className="!text-base text-text-secondary" />
                        <span className="text-xs text-text">{location.name}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                {car.tracking?.enabled && (
                  <div className="mt-6 space-y-2 text-sm text-text">
                    <h3 className="text-base font-semibold">Safe tracking</h3>
                    <p><strong>Device ID:</strong> {car.tracking.deviceId || '\u2014'}</p>
                    <p><strong>Device name:</strong> {tracking?.tracking?.deviceName || car.tracking.deviceName || '\u2014'}</p>
                    <p><strong>Status:</strong> {tracking?.tracking?.status || car.tracking.status || '\u2014'}</p>
                    <p><strong>Current position:</strong> {tracking?.currentPosition ? `${tracking.currentPosition.latitude}, ${tracking.currentPosition.longitude}` : 'No live position yet'}</p>
                    <p><strong>Latest safe alert:</strong> {tracking?.geofenceExitEvents?.[0]?.type || car.tracking.lastEventType || 'No zone-exit alert recorded'}</p>
                    {car.tracking.notes && <p><strong>Notes:</strong> {car.tracking.notes}</p>}
                    {tracking?.traccarUrl && (
                      <p>
                        <a href={tracking.traccarUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Open Traccar dashboard</a>
                      </p>
                    )}
                    {tracking?.warning && <p className="text-warning">{tracking.warning}</p>}
                    {tracking?.positions && tracking.positions.length > 0 && (
                      <div>
                        <strong>Recent movement history</strong>
                        <ul className="list-disc ml-5 mt-1 space-y-0.5">
                          {tracking.positions.slice(0, 5).map((position, index) => (
                            <li key={`${position.id || index}`} className="text-xs text-text-secondary">
                              {`${position.fixTime || position.deviceTime || 'Unknown time'} \u2014 ${position.latitude}, ${position.longitude}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {tracking?.geofences && tracking.geofences.length > 0 && (
                      <div>
                        <strong>Geofences</strong>
                        <ul className="list-disc ml-5 mt-1 space-y-0.5">
                          {tracking.geofences.slice(0, 5).map((geofence, index) => (
                            <li key={`${geofence.id || index}`} className="text-xs text-text-secondary">{geofence.name || geofence.description || `Geofence ${index + 1}`}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
            {edit && (
              <section className="flex flex-wrap gap-3 p-4 max-md:justify-center md:justify-end">
                <button
                  type="button"
                  className="flex items-center gap-2 bg-primary text-white h-10 px-5 rounded-xl font-semibold text-sm hover:bg-primary-dark shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5"
                  onClick={() => navigate(`/update-car?cr=${car._id}`)}
                >
                  {commonStrings.UPDATE}
                </button>
                <button
                  type="button"
                  className="flex items-center gap-2 bg-danger text-white h-10 px-5 rounded-xl font-semibold text-sm hover:bg-red-600 transition-all hover:-translate-y-0.5"
                  onClick={handleDelete}
                >
                  {commonStrings.DELETE}
                </button>
              </section>
            )}
          </div>
          <div className="max-md:flex max-md:flex-col max-md:items-center md:absolute md:inset-[0_0_0_400px]">
            <BookingList
              containerClassName="car"
              offset={offset}
              loggedUser={user}
              suppliers={suppliers}
              statuses={statuses}
              car={car._id}
              hideSupplierColumn
              hideCarColumn
              hideDates={env.isMobile}
              checkboxSelection={!env.isMobile}
            />
          </div>
        </div>
      )}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openInfoDialog}>
        <DialogTitle className="!font-semibold !text-text">{commonStrings.INFO}</DialogTitle>
        <DialogContent>{strings.CANNOT_DELETE_CAR}</DialogContent>
        <DialogActions className="!p-4">
          <Button onClick={handleCloseInfo} variant="contained" className="!bg-border !text-text-secondary !rounded-xl !normal-case !shadow-none">
            {commonStrings.CLOSE}
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="!font-semibold !text-text">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{strings.DELETE_CAR}</DialogContent>
        <DialogActions className="!p-4">
          <Button onClick={handleCancelDelete} variant="contained" className="!bg-border !text-text-secondary !rounded-xl !normal-case !shadow-none">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" className="!bg-danger !text-white !rounded-xl !normal-case !shadow-none">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {error && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default Car

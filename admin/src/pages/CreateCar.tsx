import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  FormHelperText,
} from '@mui/material'
import {
  Info as InfoIcon,
  Close as CloseIcon,
  Add as AddIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/create-car'
import * as CarService from '@/services/CarService'
import * as helper from '@/utils/helper'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import SupplierSelectList from '@/components/SupplierSelectList'
import LocationSelectList from '@/components/LocationSelectList'
import CarTypeList from '@/components/CarTypeList'
import GearboxList from '@/components/GearboxList'
import SeatsList from '@/components/SeatsList'
import DoorsList from '@/components/DoorsList'
import FuelPolicyList from '@/components/FuelPolicyList'
import CarRangeList from '@/components/CarRangeList'
import MultimediaList from '@/components/MultimediaList'
import DateBasedPriceEditList from '@/components/DateBasedPriceEditList'
import { UserContextType, useUserContext } from '@/context/UserContext'
import { Option, Supplier } from '@/models/common'
import { schema, FormFields, DateBasedPrice } from '@/models/CarForm'

const CreateCar = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType

  const [isSupplier, setIsSupplier] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [imageSizeError, setImageSizeError] = useState(false)
  const [image, setImage] = useState('')
  const [pendingImages, setPendingImages] = useState<File[]>([])
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([])
  const additionalFileInputRef = useRef<HTMLInputElement>(null)

  // Initialize react-hook-form
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    register,
    getValues,
    clearErrors,
    setFocus,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      name: '',
      licensePlate: '',
      supplier: undefined,
      minimumAge: String(env.MINIMUM_AGE),
      locations: [],
      dailyPrice: '',
      discountedDailyPrice: '',
      hourlyPrice: '',
      discountedHourlyPrice: '',
      biWeeklyPrice: '',
      discountedBiWeeklyPrice: '',
      weeklyPrice: '',
      discountedWeeklyPrice: '',
      monthlyPrice: '',
      discountedMonthlyPrice: '',
      deposit: '',
      available: true,
      fullyBooked: false,
      comingSoon: false,
      blockOnPay: true,
      type: '',
      gearbox: '',
      seats: '',
      doors: '',
      aircon: false,
      mileage: '',
      fuelPolicy: '',
      cancellation: '',
      amendments: '',
      theftProtection: '',
      collisionDamageWaiver: '',
      fullInsurance: '',
      additionalDriver: '',
      range: '',
      multimedia: [],
      rating: '',
      co2: '',
      trackingEnabled: false,
      trackingDeviceId: '',
      trackingDeviceName: '',
      trackingNotes: '',
      isDateBasedPrice: false,
      dateBasedPrices: [],
    }
  })

  // Use watch to track form values
  const isDateBasedPrice = useWatch({ control, name: 'isDateBasedPrice' })
  const dateBasedPrices = useWatch({ control, name: 'dateBasedPrices' })
  const range = useWatch({ control, name: 'range' })
  const multimedia = useWatch({ control, name: 'multimedia' })
  const available = useWatch({ control, name: 'available' })
  const fullyBooked = useWatch({ control, name: 'fullyBooked' })
  const comingSoon = useWatch({ control, name: 'comingSoon' })
  const blockOnPay = useWatch({ control, name: 'blockOnPay' })
  const type = useWatch({ control, name: 'type' })
  const trackingEnabled = useWatch({ control, name: 'trackingEnabled' })
  const gearbox = useWatch({ control, name: 'gearbox' })
  const seats = useWatch({ control, name: 'seats' })
  const doors = useWatch({ control, name: 'doors' })
  const fuelPolicy = useWatch({ control, name: 'fuelPolicy' })
  const aircon = useWatch({ control, name: 'aircon' })


  const videoExtensions = ['.mp4', '.webm', '.mov']
  const isPendingVideo = (file: File): boolean => videoExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))

  // Clean up object URLs on unmount
  useEffect(() => () => {
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBeforeUpload = () => {
    setLoading(true)
  }

  const handleImageChange = (_image: bookcarsTypes.Car | string | null) => {
    setLoading(false)
    setImage(_image as string)

    if (_image !== null) {
      setImageError(false)
    }
  }

  const handleImageValidate = (valid: boolean) => {
    if (!valid) {
      setImageSizeError(true)
      setImageError(false)
      setLoading(false)
    } else {
      setImageSizeError(false)
      setImageError(false)
    }
  }

  const extraToNumber = (extra: string) => (extra === '' ? -1 : Number(extra))

  const getPrice = (price: string) => (price && Number(price)) || null

  const onSubmit = async (data: FormFields) => {
    try {
      if (!image) {
        setImageError(true)
        setImageSizeError(false)
        setLoading(false)
        return
      }

      if (data.licensePlate) {
        const res = await CarService.validateLicensePlate(data.licensePlate)
        if (res === 204) {
          helper.error(null, strings.LICENSE_PLATE_ALREADY_EXISTS)
          return
        }
      }

      const payload: bookcarsTypes.CreateCarPayload = {
        loggedUser: user!._id!,
        name: data.name,
        licensePlate: data.licensePlate || '',
        supplier: data.supplier?._id!,
        minimumAge: Number.parseInt(data.minimumAge, 10),
        locations: data.locations.map((l) => l._id),
        dailyPrice: Number(data.dailyPrice),
        discountedDailyPrice: getPrice(data.discountedDailyPrice || ''),
        hourlyPrice: getPrice(data.hourlyPrice || ''),
        discountedHourlyPrice: getPrice(data.discountedHourlyPrice || ''),
        biWeeklyPrice: getPrice(data.biWeeklyPrice || ''),
        discountedBiWeeklyPrice: getPrice(data.discountedBiWeeklyPrice || ''),
        weeklyPrice: getPrice(data.weeklyPrice || ''),
        discountedWeeklyPrice: getPrice(data.discountedWeeklyPrice || ''),
        monthlyPrice: getPrice(data.monthlyPrice || ''),
        discountedMonthlyPrice: getPrice(data.discountedMonthlyPrice || ''),
        deposit: Number(data.deposit),
        available: data.available,
        fullyBooked: data.fullyBooked,
        comingSoon: data.comingSoon,
        blockOnPay: data.blockOnPay,
        type: data.type,
        gearbox: data.gearbox,
        aircon: data.aircon,
        image,
        seats: Number.parseInt(data.seats, 10),
        doors: Number.parseInt(data.doors, 10),
        fuelPolicy: data.fuelPolicy,
        mileage: extraToNumber(data.mileage || ''),
        cancellation: extraToNumber(data.cancellation || ''),
        amendments: extraToNumber(data.amendments || ''),
        theftProtection: extraToNumber(data.theftProtection || ''),
        collisionDamageWaiver: extraToNumber(data.collisionDamageWaiver || ''),
        fullInsurance: extraToNumber(data.fullInsurance || ''),
        additionalDriver: extraToNumber(data.additionalDriver || ''),
        range: data.range,
        multimedia: data.multimedia || [],
        rating: data.rating ? Number(data.rating) : undefined,
        co2: data.co2 ? Number(data.co2) : undefined,
        tracking: {
          enabled: data.trackingEnabled,
          deviceId: data.trackingDeviceId ? Number.parseInt(data.trackingDeviceId, 10) : undefined,
          deviceName: data.trackingDeviceName,
          notes: data.trackingNotes,
        },
        isDateBasedPrice: data.isDateBasedPrice,
        dateBasedPrices: data.dateBasedPrices || [],
      }

      const car = await CarService.create(payload)

      if (car && car._id) {
        if (pendingImages.length > 0) {
          try {
            await CarService.addImages(car._id, pendingImages)
          } catch (err) {
            helper.error(err)
          }
        }
        navigate('/cars')
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onError = () => {
    const firstErrorField = Object.keys(errors)[0] as keyof FormFields
    if (firstErrorField) {
      setFocus(firstErrorField)
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user && user.verified) {
      setVisible(true)

      if (user.type === bookcarsTypes.RecordType.Supplier) {
        setValue('supplier', {
          _id: user._id,
          name: user.fullName,
          image: user.avatar,
        } as Supplier)
        setIsSupplier(true)
      }
    }
  }

  const handleCancel = async () => {
    if (image) {
      await CarService.deleteTempImage(image)
    }
    pendingPreviews.forEach((url) => URL.revokeObjectURL(url))
    navigate('/cars')
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-4xl mx-auto space-y-6 py-6" style={visible ? {} : { display: 'none' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/cars')} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-background transition-colors">
            <span className="text-text-secondary text-lg">&larr;</span>
          </button>
          <h1 className="text-2xl font-bold text-text">{strings.NEW_CAR_HEADING}</h1>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-5">
          <form onSubmit={handleSubmit(onSubmit, onError)}>
            <Avatar
              type={bookcarsTypes.RecordType.Car}
              mode="create"
              record={null}
              size="large"
              readonly={false}
              onBeforeUpload={handleBeforeUpload}
              onChange={handleImageChange}
              onValidate={handleImageValidate}
              color="disabled"
              className="rounded-xl overflow-hidden"
            />

            <div className="flex items-center gap-2 text-text-muted text-sm mt-2">
              <InfoIcon className="!text-base" />
              <span>{strings.RECOMMENDED_IMAGE_SIZE}</span>
            </div>

            <div className="mt-2 mb-4">
              <h3 className="my-4 mb-2 text-base font-medium text-black/60">Additional Images &amp; Videos</h3>
              <div className="grid grid-cols-4 gap-3 max-md:grid-cols-3 max-sm:grid-cols-2">
                {pendingPreviews.map((preview, index) => {
                  const video = isPendingVideo(pendingImages[index])
                  return (
                    <div key={preview} className="relative rounded-xl overflow-hidden aspect-[4/3] bg-[#f1f5f9] cursor-grab transition-[opacity,border-color] duration-200 border-2 border-transparent active:cursor-grabbing">
                      {video ? (
                        <>
                          <video src={preview} muted preload="metadata" className="w-full h-full object-cover block" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                            <PlayArrowIcon className="!w-10 !h-10 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />
                          </div>
                        </>
                      ) : (
                        <img src={preview} alt={`Pending image ${index + 1}`} className="w-full h-full object-cover block" />
                      )}
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-black/60 text-white rounded-full w-7 h-7 border-none cursor-pointer flex items-center justify-center p-0 transition-colors duration-200 z-[2] hover:bg-black/80 [&_svg]:w-4 [&_svg]:h-4"
                        onClick={() => {
                          URL.revokeObjectURL(preview)
                          setPendingImages((prev) => prev.filter((_, i) => i !== index))
                          setPendingPreviews((prev) => prev.filter((_, i) => i !== index))
                        }}
                        aria-label="Remove image"
                      >
                        <CloseIcon />
                      </button>
                    </div>
                  )
                })}
                <button
                  type="button"
                  className="border-2 border-dashed border-[#cbd5e1] rounded-xl flex flex-col items-center justify-center cursor-pointer aspect-[4/3] bg-transparent transition-[border-color,background] duration-200 gap-1 p-0 hover:border-primary hover:bg-primary/[0.04] [&_svg]:w-8 [&_svg]:h-8 [&_svg]:text-text-muted [&_span]:text-xs [&_span]:text-text-muted"
                  onClick={() => additionalFileInputRef.current?.click()}
                >
                  <AddIcon />
                  <span>Add images</span>
                </button>
                <input
                  ref={additionalFileInputRef}
                  type="file"
                  accept="image/*,video/mp4,video/webm,video/quicktime"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    setPendingImages((prev) => [...prev, ...files])
                    setPendingPreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))])
                    e.target.value = ''
                  }}
                />
              </div>
            </div>

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{strings.NAME}</InputLabel>
              <Input
                type="text"
                {...register('name')}
                required
                autoComplete="off"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{strings.LICENSE_PLATE}</InputLabel>
              <Input
                type="text"
                {...register('licensePlate')}
                autoComplete="off"
              />
            </FormControl>

            {!isSupplier && (
              <FormControl fullWidth margin="dense">
                <SupplierSelectList
                  label={strings.SUPPLIER}
                  required
                  variant="standard"
                  onChange={(values) => setValue('supplier', values.length > 0 ? values[0] as Supplier : undefined)}
                />
              </FormControl>
            )}

            <FormControl fullWidth margin="dense">
              <InputLabel className="required">{strings.MINIMUM_AGE}</InputLabel>
              <Input
                type="text"
                required
                {...register('minimumAge')}
                error={!!errors.minimumAge}
                autoComplete="off"
                onChange={() => {
                  if (errors.minimumAge) {
                    clearErrors('minimumAge')
                  }
                }}
              />
              {errors.minimumAge && (
                <FormHelperText error>{errors.minimumAge.message}</FormHelperText>
              )}
            </FormControl>

            <FormControl fullWidth margin="dense">
              <LocationSelectList
                label={strings.LOCATIONS}
                multiple
                required
                variant="standard"
                onChange={(values) => setValue('locations', values as Option[])}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.DAILY_PRICE} (${commonStrings.CURRENCY})`}
                {...register('dailyPrice')}
                error={!!errors.dailyPrice}
                helperText={errors.dailyPrice?.message}
                required
                variant="standard"
                autoComplete="off"
                onChange={() => {
                  if (errors.dailyPrice) {
                    clearErrors('dailyPrice')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${strings.DISCOUNTED_DAILY_PRICE} (${commonStrings.CURRENCY})`}
                {...register('discountedDailyPrice')}
                variant="standard"
                autoComplete="off"
                error={!!errors.discountedDailyPrice}
                helperText={errors.discountedDailyPrice?.message}
                onChange={() => {
                  if (errors.discountedDailyPrice) {
                    clearErrors('discountedDailyPrice')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={(
                  <Switch
                    checked={isDateBasedPrice}
                    onChange={(e) => setValue('isDateBasedPrice', e.target.checked)}
                    color="primary"
                  />
                )}
                label={strings.IS_DATE_BASED_PRICE}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            {isDateBasedPrice && (
              <DateBasedPriceEditList
                title={strings.DATE_BASED_PRICES}
                values={dateBasedPrices as bookcarsTypes.DateBasedPrice[]}
                onAdd={(value) => {
                  const newValues = [...(dateBasedPrices || []), value]
                  setValue('dateBasedPrices', newValues as DateBasedPrice[])
                }}
                onUpdate={(value, index) => {
                  const newValues = [...(dateBasedPrices || [])]
                  newValues[index] = value as DateBasedPrice
                  setValue('dateBasedPrices', newValues as DateBasedPrice[])
                }}
                onDelete={(_, index) => {
                  const newValues = [...(dateBasedPrices || [])]
                  newValues.splice(index, 1)
                  setValue('dateBasedPrices', newValues as DateBasedPrice[])
                }}
              />
            )}

            {!isDateBasedPrice && (
              <>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.HOURLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('hourlyPrice')}
                    error={!!errors.hourlyPrice}
                    helperText={errors.hourlyPrice?.message}
                    variant="standard"
                    autoComplete="off"
                    onChange={() => {
                      if (errors.hourlyPrice) {
                        clearErrors('hourlyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.DISCOUNTED_HOURLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('discountedHourlyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.discountedHourlyPrice}
                    helperText={errors.discountedHourlyPrice?.message}
                    onChange={() => {
                      if (errors.discountedHourlyPrice) {
                        clearErrors('discountedHourlyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('biWeeklyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.biWeeklyPrice}
                    helperText={errors.biWeeklyPrice?.message}
                    onChange={() => {
                      if (errors.biWeeklyPrice) {
                        clearErrors('biWeeklyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.DISCOUNTED_BI_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('discountedBiWeeklyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.discountedBiWeeklyPrice}
                    helperText={errors.discountedBiWeeklyPrice?.message}
                    onChange={() => {
                      if (errors.discountedBiWeeklyPrice) {
                        clearErrors('discountedBiWeeklyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('weeklyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.weeklyPrice}
                    helperText={errors.weeklyPrice?.message}
                    onChange={() => {
                      if (errors.weeklyPrice) {
                        clearErrors('weeklyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.DISCOUNTED_WEEKLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('discountedWeeklyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.discountedWeeklyPrice}
                    helperText={errors.discountedWeeklyPrice?.message}
                    onChange={() => {
                      if (errors.discountedWeeklyPrice) {
                        clearErrors('discountedWeeklyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.MONTHLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('monthlyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.monthlyPrice}
                    helperText={errors.monthlyPrice?.message}
                    onChange={() => {
                      if (errors.monthlyPrice) {
                        clearErrors('monthlyPrice')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label={`${strings.DISCOUNTED_MONThLY_PRICE} (${commonStrings.CURRENCY})`}
                    {...register('discountedMonthlyPrice')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.discountedMonthlyPrice}
                    helperText={errors.discountedMonthlyPrice?.message}
                    onChange={() => {
                      if (errors.discountedMonthlyPrice) {
                        clearErrors('discountedMonthlyPrice')
                      }
                    }}
                  />
                </FormControl>
              </>
            )}

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.DEPOSIT} (${commonStrings.CURRENCY})`}
                {...register('deposit')}
                required
                variant="standard"
                autoComplete="off"
                error={!!errors.deposit}
                helperText={errors.deposit?.message}
                onChange={() => {
                  if (errors.deposit) {
                    clearErrors('deposit')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <CarRangeList
                label={strings.CAR_RANGE}
                variant="standard"
                required
                value={range}
                onChange={(value) => setValue('range', value)}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <MultimediaList
                label={strings.MULTIMEDIA}
                value={multimedia as bookcarsTypes.CarMultimedia[]}
                onChange={(value) => {
                  const currentValue = getValues('multimedia')
                  if (JSON.stringify(currentValue) !== JSON.stringify(value)) {
                    setValue('multimedia', value)
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={strings.RATING}
                {...register('rating')}
                variant="standard"
                autoComplete="off"
                slotProps={{
                  htmlInput: {
                    type: 'number',
                    min: 1,
                    max: 5,
                    step: 0.01,
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={strings.CO2}
                {...register('co2')}
                variant="standard"
                autoComplete="off"
                error={!!errors.co2}
                helperText={errors.co2?.message}
                onChange={() => {
                  if (errors.co2) {
                    clearErrors('co2')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={
                  <Switch
                    checked={trackingEnabled}
                    onChange={(e) => setValue('trackingEnabled', e.target.checked)}
                    color="primary"
                  />
                }
                label="Enable Traccar tracking"
                className="text-text-secondary text-sm"
              />
            </FormControl>

            {trackingEnabled && (
              <>
                <FormControl fullWidth margin="dense">
                  <TextField
                    label="Traccar device ID"
                    {...register('trackingDeviceId')}
                    variant="standard"
                    autoComplete="off"
                    error={!!errors.trackingDeviceId}
                    helperText={errors.trackingDeviceId?.message || 'Link this car to a Traccar device for safe tracking visibility.'}
                    onChange={() => {
                      if (errors.trackingDeviceId) {
                        clearErrors('trackingDeviceId')
                      }
                    }}
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label="Tracked device name"
                    {...register('trackingDeviceName')}
                    variant="standard"
                    autoComplete="off"
                  />
                </FormControl>

                <FormControl fullWidth margin="dense">
                  <TextField
                    label="Tracking notes"
                    {...register('trackingNotes')}
                    variant="standard"
                    autoComplete="off"
                    multiline
                    minRows={2}
                  />
                </FormControl>
              </>
            )}

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={
                  <Switch
                    checked={available}
                    onChange={(e) => setValue('available', e.target.checked)}
                    color="primary"
                  />
                }
                label={strings.AVAILABLE}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={(
                  <Switch
                    checked={fullyBooked}
                    onChange={(e) => setValue('fullyBooked', e.target.checked)}
                    color="primary"
                  />
                )}
                label={strings.FULLY_BOOKED}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={(
                  <Switch
                    checked={comingSoon}
                    onChange={(e) => setValue('comingSoon', e.target.checked)}
                    color="primary"
                  />
                )}
                label={strings.COMING_SOON}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={(
                  <Switch
                    checked={blockOnPay}
                    onChange={(e) => setValue('blockOnPay', e.target.checked)}
                    color="primary"
                  />
                )}
                label={strings.BLOCK_ON_PAY}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <CarTypeList
                label={strings.CAR_TYPE}
                variant="standard"
                required
                value={type}
                onChange={(value) => setValue('type', value)}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <GearboxList
                label={strings.GEARBOX}
                variant="standard"
                required
                value={gearbox}
                onChange={(value) => setValue('gearbox', value)}

              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <SeatsList
                label={strings.SEATS}
                variant="standard"
                required
                value={seats}
                onChange={(value) => setValue('seats', value.toString())}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <DoorsList
                label={strings.DOORS}
                variant="standard"
                required
                value={doors}
                onChange={(value) => setValue('doors', value.toString())}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <FuelPolicyList
                label={csStrings.FUEL_POLICY}
                variant="standard"
                required
                value={fuelPolicy}
                onChange={(value) => setValue('fuelPolicy', value)}
              />
            </FormControl>

            <div className="flex items-center gap-2 text-text-muted text-sm mt-4 mb-2">
              <InfoIcon className="!text-base" />
              <span>{commonStrings.OPTIONAL}</span>
            </div>

            <FormControl fullWidth margin="dense" className="!my-3">
              <FormControlLabel
                control={
                  <Switch
                    checked={aircon}
                    onChange={(e) => setValue('aircon', e.target.checked)}
                    color="primary"
                  />
                }
                label={strings.AIRCON}
                className="text-text-secondary text-sm"
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.MILEAGE} (${csStrings.MILEAGE_UNIT})`}
                {...register('mileage')}
                variant="standard"
                autoComplete="off"
                error={!!errors.mileage}
                helperText={errors.mileage?.message}
                onChange={() => {
                  if (errors.mileage) {
                    clearErrors('mileage')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.CANCELLATION} (${commonStrings.CURRENCY})`}
                {...register('cancellation')}
                variant="standard"
                autoComplete="off"
                error={!!errors.cancellation}
                helperText={errors.cancellation?.message}
                onChange={() => {
                  if (errors.cancellation) {
                    clearErrors('cancellation')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.AMENDMENTS} (${commonStrings.CURRENCY})`}
                {...register('amendments')}
                variant="standard"
                autoComplete="off"
                error={!!errors.amendments}
                helperText={errors.amendments?.message}
                onChange={() => {
                  if (errors.amendments) {
                    clearErrors('amendments')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.THEFT_PROTECTION} (${csStrings.CAR_CURRENCY})`}
                {...register('theftProtection')}
                variant="standard"
                autoComplete="off"
                error={!!errors.theftProtection}
                helperText={errors.theftProtection?.message}
                onChange={() => {
                  if (errors.theftProtection) {
                    clearErrors('theftProtection')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.COLLISION_DAMAGE_WAVER} (${csStrings.CAR_CURRENCY})`}
                {...register('collisionDamageWaiver')}
                variant="standard"
                autoComplete="off"
                error={!!errors.collisionDamageWaiver}
                helperText={errors.collisionDamageWaiver?.message}
                onChange={() => {
                  if (errors.collisionDamageWaiver) {
                    clearErrors('collisionDamageWaiver')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.FULL_INSURANCE} (${csStrings.CAR_CURRENCY})`}
                {...register('fullInsurance')}
                variant="standard"
                autoComplete="off"
                error={!!errors.fullInsurance}
                helperText={errors.fullInsurance?.message}
                onChange={() => {
                  if (errors.fullInsurance) {
                    clearErrors('fullInsurance')
                  }
                }}
              />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <TextField
                label={`${csStrings.ADDITIONAL_DRIVER} (${csStrings.CAR_CURRENCY})`}
                {...register('additionalDriver')}
                variant="standard"
                autoComplete="off"
                error={!!errors.additionalDriver}
                helperText={errors.additionalDriver?.message}
                onChange={() => {
                  if (errors.additionalDriver) {
                    clearErrors('additionalDriver')
                  }
                }}
              />
            </FormControl>

            <div className="flex justify-end gap-3 mt-6">
              <Button variant="contained" className="!bg-border !text-text-secondary !rounded-xl !normal-case !font-medium !px-6 !py-2.5 !shadow-none" size="small" onClick={handleCancel}>
                {commonStrings.CANCEL}
              </Button>
              <Button type="submit" variant="contained" className="!bg-primary !text-white !rounded-xl !normal-case !font-semibold !px-6 !py-2.5 !shadow-none hover:!bg-primary-dark" size="small" disabled={loading || isSubmitting}>
                {commonStrings.CREATE}
              </Button>
            </div>

            <div className="mt-4">
              {imageError && <Error message={commonStrings.IMAGE_REQUIRED} />}
              {imageSizeError && <Error message={strings.CAR_IMAGE_SIZE_ERROR} />}
              {/* {Object.keys(errors).length > 0 && <Error message={commonStrings.FORM_ERROR} />} */}
            </div>
          </form>
        </div>
      </div>

      {(loading || isSubmitting) && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout >
  )
}

export default CreateCar

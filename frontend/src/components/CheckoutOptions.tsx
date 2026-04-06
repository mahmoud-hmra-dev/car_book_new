import React, { useEffect, useMemo, useState } from 'react'
import {
  Switch,
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as csStrings } from '@/lang/cars'
import { strings } from '@/lang/checkout'
import * as helper from '@/utils/helper'
import * as PaymentService from '@/services/PaymentService'

import '@/assets/css/checkout-options.css'

interface CheckoutOptionsProps {
  car: bookcarsTypes.Car
  from: Date
  to: Date
  language: string
  sectionNumber?: string
  allowAdditionalDriver?: boolean
  clientSecret: string | null
  payPalLoaded: boolean
  onPriceChange: (value: number) => void
  onAdManuallyCheckedChange: (value: boolean) => void
  onCancellationChange: (value: boolean) => void
  onAmendmentsChange: (value: boolean) => void
  onTheftProtectionChange: (value: boolean) => void
  onCollisionDamageWaiverChange: (value: boolean) => void
  onFullInsuranceChange: (value: boolean) => void
  onAdditionalDriverChange: (value: boolean) => void
}

interface OptionInfo {
  label: string
  description: string
  priceText: string
  isIncluded: boolean
  isUnavailable: boolean
  value: number
  checked: boolean
  disabled: boolean
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const CheckoutOptions = ({
  car,
  from,
  to,
  language,
  sectionNumber = '2',
  allowAdditionalDriver = true,
  clientSecret,
  payPalLoaded,
  onPriceChange,
  onAdManuallyCheckedChange,
  onCancellationChange,
  onAmendmentsChange,
  onTheftProtectionChange,
  onCollisionDamageWaiverChange,
  onFullInsuranceChange,
  onAdditionalDriverChange,
}: CheckoutOptionsProps) => {
  const days = useMemo(() => {
    if (from && to) {
      return bookcarsHelper.days(from, to)
    }
    return 0
  }, [from, to])
  const [cancellation, setCancellation] = useState(false)
  const [amendments, setAmendments] = useState(false)
  const [theftProtection, setTheftProtection] = useState(false)
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState(false)
  const [fullInsurance, setFullInsurance] = useState(false)
  const [additionalDriver, setAdditionalDriver] = useState(false)

  const [cancellationOption, setCancellationOption] = useState('')
  const [amendmentsOption, setAmendmentsOption] = useState('')
  const [theftProtectionOption, setTheftProtectionOption] = useState('')
  const [collisionDamageWaiverOption, setCollisionDamageWaiverOption] = useState('')
  const [fullInsuranceOption, setFullInsuranceOption] = useState('')
  const [additionalDriverOption, setAdditionalDriverOption] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPrices = async () => {
      const priceChangeRate = car.supplier.priceChangeRate || 0
      setCancellationOption(await helper.getCancellationOption(car.cancellation, language, priceChangeRate))
      setAmendmentsOption(await helper.getAmendmentsOption(car.amendments, language, priceChangeRate))
      setTheftProtectionOption(await helper.getTheftProtectionOption(car.theftProtection, days, language, priceChangeRate))
      setCollisionDamageWaiverOption(await helper.getCollisionDamageWaiverOption(car.collisionDamageWaiver, days, language, priceChangeRate))
      setFullInsuranceOption(await helper.getFullInsuranceOption(car.fullInsurance, days, language, priceChangeRate))
      setAdditionalDriverOption(await helper.getAdditionalDriverOption(car.additionalDriver, days, language, priceChangeRate))
      setLoading(false)
    }

    fetchPrices()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (car) {
      setCancellation(car.cancellation === 0)
      setAmendments(car.amendments === 0)
      setTheftProtection(car.theftProtection === 0)
      setCollisionDamageWaiver(car.collisionDamageWaiver === 0)
      setFullInsurance(car.fullInsurance === 0)
      setAdditionalDriver(allowAdditionalDriver && car.additionalDriver === 0)
    }
  }, [allowAdditionalDriver, car])

  useEffect(() => {
    if (!allowAdditionalDriver) {
      setAdditionalDriver(false)
      onAdditionalDriverChange(false)
      onAdManuallyCheckedChange(false)
    }
  }, [allowAdditionalDriver, onAdManuallyCheckedChange, onAdditionalDriverChange])

  if (loading) {
    return null
  }

  const calculateNewPrice = async (options: bookcarsTypes.CarOptions) => {
    const _price = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from, to, car.supplier.priceChangeRate || 0, options))
    return _price
  }

  const handleCancellationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _cancellation = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation: _cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setCancellation(_cancellation)
      onCancellationChange(_cancellation)
      onPriceChange(_price)
    }
  }

  const handleAmendmentsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _amendments = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments: _amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setAmendments(_amendments)
      onAmendmentsChange(_amendments)
      onPriceChange(_price)
    }
  }

  const handleTheftProtectionChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _theftProtection = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection: _theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setTheftProtection(_theftProtection)
      onTheftProtectionChange(_theftProtection)
      onPriceChange(_price)
    }
  }

  const handleCollisionDamageWaiverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _collisionDamageWaiver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver: _collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setCollisionDamageWaiver(_collisionDamageWaiver)
      onCollisionDamageWaiverChange(_collisionDamageWaiver)
      onPriceChange(_price)
    }
  }

  const handleFullInsuranceChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _fullInsurance = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance: _fullInsurance,
        additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setFullInsurance(_fullInsurance)
      onFullInsuranceChange(_fullInsurance)
      onPriceChange(_price)
    }
  }

  const handleAdditionalDriverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (car && from && to) {
      const _additionalDriver = e.target.checked
      const options: bookcarsTypes.CarOptions = {
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver: _additionalDriver,
      }
      const _price = await calculateNewPrice(options)
      setAdditionalDriver(_additionalDriver)
      onAdditionalDriverChange(_additionalDriver)
      onPriceChange(_price)
      onAdManuallyCheckedChange(_additionalDriver)
    }
  }

  const descriptions: Record<string, string> = {
    cancellation: csStrings.CANCELLATION_TOOLTIP,
    amendments: csStrings.AMENDMENTS_TOOLTIP,
    theftProtection: csStrings.THEFT_PROTECTION_TOOLTIP,
    collisionDamageWaiver: csStrings.COLLISION_DAMAGE_WAVER_TOOLTIP,
    fullInsurance: csStrings.FULL_INSURANCE_TOOLTIP,
    additionalDriver: '',
  }

  const paymentLocked = !!clientSecret || payPalLoaded

  const options: OptionInfo[] = [
    {
      label: csStrings.CANCELLATION,
      description: descriptions.cancellation,
      priceText: cancellationOption,
      isIncluded: car.cancellation === 0,
      isUnavailable: car.cancellation === -1,
      value: car.cancellation,
      checked: cancellation,
      disabled: car.cancellation === -1 || car.cancellation === 0 || paymentLocked,
      onChange: handleCancellationChange,
    },
    {
      label: csStrings.AMENDMENTS,
      description: descriptions.amendments,
      priceText: amendmentsOption,
      isIncluded: car.amendments === 0,
      isUnavailable: car.amendments === -1,
      value: car.amendments,
      checked: amendments,
      disabled: car.amendments === -1 || car.amendments === 0 || paymentLocked,
      onChange: handleAmendmentsChange,
    },
    {
      label: csStrings.THEFT_PROTECTION,
      description: descriptions.theftProtection,
      priceText: theftProtectionOption,
      isIncluded: car.theftProtection === 0,
      isUnavailable: car.theftProtection === -1,
      value: car.theftProtection,
      checked: theftProtection,
      disabled: car.theftProtection === -1 || car.theftProtection === 0 || paymentLocked,
      onChange: handleTheftProtectionChange,
    },
    {
      label: csStrings.COLLISION_DAMAGE_WAVER,
      description: descriptions.collisionDamageWaiver,
      priceText: collisionDamageWaiverOption,
      isIncluded: car.collisionDamageWaiver === 0,
      isUnavailable: car.collisionDamageWaiver === -1,
      value: car.collisionDamageWaiver,
      checked: collisionDamageWaiver,
      disabled: car.collisionDamageWaiver === -1 || car.collisionDamageWaiver === 0 || paymentLocked,
      onChange: handleCollisionDamageWaiverChange,
    },
    {
      label: csStrings.FULL_INSURANCE,
      description: descriptions.fullInsurance,
      priceText: fullInsuranceOption,
      isIncluded: car.fullInsurance === 0,
      isUnavailable: car.fullInsurance === -1,
      value: car.fullInsurance,
      checked: fullInsurance,
      disabled: car.fullInsurance === -1 || car.fullInsurance === 0 || paymentLocked,
      onChange: handleFullInsuranceChange,
    },
  ]

  if (allowAdditionalDriver) {
    options.push({
      label: csStrings.ADDITIONAL_DRIVER,
      description: descriptions.additionalDriver,
      priceText: additionalDriverOption,
      isIncluded: car.additionalDriver === 0,
      isUnavailable: car.additionalDriver === -1,
      value: car.additionalDriver,
      checked: additionalDriver,
      disabled: car.additionalDriver === -1 || car.additionalDriver === 0 || paymentLocked,
      onChange: handleAdditionalDriverChange,
    })
  }

  // Filter out unavailable options
  const visibleOptions = options.filter((opt) => !opt.isUnavailable)

  return (
    <div className="checkout-options-container">
      <div className="checkout-info">
        <div className="checkout-section-number">{sectionNumber}</div>
        <span className="checkout-section-title">{strings.BOOKING_OPTIONS}</span>
      </div>
      <div className="checkout-options">
        {visibleOptions.map((opt) => (
          <div
            key={opt.label}
            className={`option-card${opt.checked ? ' selected' : ''}${opt.disabled ? ' disabled' : ''}`}
            onClick={() => {
              if (!opt.disabled) {
                const syntheticEvent = { target: { checked: !opt.checked } } as React.ChangeEvent<HTMLInputElement>
                opt.onChange(syntheticEvent)
              }
            }}
            role="button"
            tabIndex={opt.disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (!opt.disabled && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                const syntheticEvent = { target: { checked: !opt.checked } } as React.ChangeEvent<HTMLInputElement>
                opt.onChange(syntheticEvent)
              }
            }}
          >
            <Switch
              checked={opt.checked}
              disabled={opt.disabled}
              color="primary"
              size="small"
              onClick={(e) => e.stopPropagation()}
              onChange={opt.onChange}
            />
            <div className="option-card-body">
              <div className="option-card-name">{opt.label}</div>
              {opt.description && (
                <div className="option-card-desc">{opt.description}</div>
              )}
            </div>
            <div className="option-card-price">
              {opt.isIncluded ? (
                <span className="option-card-price-included">{csStrings.INCLUDED}</span>
              ) : (
                <span className="option-card-price-value">{opt.priceText}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CheckoutOptions

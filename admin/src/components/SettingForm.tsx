import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormControl, FormHelperText, Input, InputLabel } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as settingsStrings } from '@/lang/settings'
import { strings } from '@/lang/setting'
import * as SettingService from '@/services/SettingService'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/SettingForm'

interface SettingFormProps {
  settings: bookcarsTypes.Setting | null
  onSubmit: (data: bookcarsTypes.Setting) => void
}

const SettingForm = ({ settings, onSubmit: onFormSubmit }: SettingFormProps) => {
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { isSubmitting, errors }, setValue, } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
  })

  useEffect(() => {
    if (settings) {
      setValue('minPickupHours', settings.minPickupHours.toString())
      setValue('minRentalHours', settings.minRentalHours.toString())
      setValue('minPickupDropoffHour', settings.minPickupDropoffHour.toString())
      setValue('maxPickupDropoffHour', settings.maxPickupDropoffHour.toString())
    }
  }, [settings, setValue])

  const onSubmit = async (data: FormFields) => {
    try {
      const payload: bookcarsTypes.UpdateSettingsPayload = {
        minPickupHours: Number(data.minPickupHours),
        minRentalHours: Number(data.minRentalHours),
        minPickupDropoffHour: Number(data.minPickupDropoffHour),
        maxPickupDropoffHour: Number(data.maxPickupDropoffHour),
      }

      const { status, data: res } = await SettingService.updateSettings(payload)

      if (status === 200) {
        if (onFormSubmit) {
          onFormSubmit(res)
        }
        helper.info(settingsStrings.SETTINGS_UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)}>
        <h1 className="text-xl font-bold text-text mb-6">{strings.SETTINGS}</h1>

        <div className="space-y-4">
          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.MIN_PICKUP_HOURS}</InputLabel>
            <Input {...register('minPickupHours')} type="text" required autoComplete="off" />
            {errors.minPickupHours && (
              <FormHelperText error>{errors.minPickupHours.message}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.MIN_RENTAL_HOURS}</InputLabel>
            <Input {...register('minRentalHours')} type="text" required autoComplete="off" />
            {errors.minRentalHours && (
              <FormHelperText error>{errors.minRentalHours.message}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.MIN_PICKUP_DROPOFF_HOUR}</InputLabel>
            <Input {...register('minPickupDropoffHour')} type="text" required autoComplete="off" />
            {errors.minPickupDropoffHour && (
              <FormHelperText error>{errors.minPickupDropoffHour.message}</FormHelperText>
            )}
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.MAX_PICKUP_DROPOFF_HOUR}</InputLabel>
            <Input {...register('maxPickupDropoffHour')} type="text" required autoComplete="off" />
            {errors.maxPickupDropoffHour && (
              <FormHelperText error>{errors.maxPickupDropoffHour.message}</FormHelperText>
            )}
          </FormControl>
        </div>

        <div className="flex items-center gap-3 mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {commonStrings.SAVE}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 px-6 bg-background text-text-secondary text-sm font-semibold rounded-xl border border-border hover:bg-border/50 transition-colors"
          >
            {commonStrings.CANCEL}
          </button>
        </div>
      </form>
    </div>
  )
}

export default SettingForm

import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { FormControl, FormControlLabel, Input, InputLabel, Switch } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings as settingsStrings } from '@/lang/settings'
import { strings } from '@/lang/bank-details-form'
import * as BankDetailsService from '@/services/BankDetailsService'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/BankDetailsForm'

interface BankDetailsFormProps {
  bankDetails: bookcarsTypes.BankDetails | null
  onSubmit: (data: bookcarsTypes.BankDetails) => void
}

const BankDetailsForm = ({ bankDetails, onSubmit: onFormSubmit }: BankDetailsFormProps) => {
  const navigate = useNavigate()

  const { register, control, handleSubmit, formState: { isSubmitting }, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const showBankDetailsPage = useWatch({ control, name: 'showBankDetailsPage' })

  useEffect(() => {
    if (bankDetails) {
      setValue('accountHolder', bankDetails.accountHolder)
      setValue('bankName', bankDetails.bankName)
      setValue('iban', bankDetails.iban)
      setValue('swiftBic', bankDetails.swiftBic)
      setValue('showBankDetailsPage', bankDetails.showBankDetailsPage)
    }
  }, [bankDetails, setValue])

  const onSubmit = async (data: FormFields) => {
    try {
      const payload: bookcarsTypes.UpsertBankDetailsPayload = {
        _id: bankDetails?._id,
        accountHolder: data.accountHolder,
        bankName: data.bankName,
        iban: data.iban,
        swiftBic: data.swiftBic,
        showBankDetailsPage: data.showBankDetailsPage,
      }

      const { status, data: res } = await BankDetailsService.upsertBankDetails(payload)

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
        <h1 className="text-xl font-bold text-text mb-6">{strings.BANK_DETAILS}</h1>

        <div className="space-y-4">
          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.ACCOUNT_HOLDER}</InputLabel>
            <Input {...register('accountHolder')} type="text" required autoComplete="off" />
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.BANK_NAME}</InputLabel>
            <Input {...register('bankName')} type="text" required autoComplete="off" />
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.IBAN}</InputLabel>
            <Input {...register('iban')} type="text" required autoComplete="off" />
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel className="required">{strings.SWIFT_BIC}</InputLabel>
            <Input {...register('swiftBic')} type="text" required autoComplete="off" />
          </FormControl>

          <FormControl component="fieldset">
            <FormControlLabel
              control={(
                <Switch
                  checked={showBankDetailsPage || false}
                  onChange={(e) => setValue('showBankDetailsPage', e.target.checked)}
                />
              )}
              label={strings.SHOW_BANK_DETAILS_PAGE}
            />
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

export default BankDetailsForm

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper
} from '@mui/material'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/create-country'
import * as CountryService from '@/services/CountryService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import { UserContextType, useUserContext } from '@/context/UserContext'
import { schema, FormFields } from '@/models/CountryForm'

const CreateCountry = () => {
  const navigate = useNavigate()
  const { user } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)

  const defaultNames = env._LANGUAGES.map(language => ({
    language: language.code,
    name: ''
  }))

  // Initialize React Hook Form
  const {
    control,
    handleSubmit,
    register,
    setError,
    formState: { errors, isSubmitting },
    reset,
    setFocus,
  } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      names: defaultNames,
    },
  })

  // Use fieldArray to handle the dynamic array of names
  const { fields } = useFieldArray({
    control,
    name: 'names',
  })

  const onSubmit = async (data: FormFields) => {
    try {
      let isValid = true
      const validationPromises = data.names.map((name, index) =>
        CountryService.validate(name).then((status) => {
          if (status !== 200) {
            setError(`names.${index}.name`, {
              type: 'manual',
              message: strings.INVALID_COUNTRY
            })
            setFocus(`names.${index}.name`)
            isValid = false
          }
          return status === 200
        })
      )

      await Promise.all(validationPromises)

      if (isValid) {
        const payload: bookcarsTypes.UpsertCountryPayload = {
          names: data.names,
          supplier: helper.supplier(user) ? user?._id : undefined,
        }
        const status = await CountryService.create(payload)

        if (status === 200) {
          // Reset form and show success message
          reset()
          helper.info(strings.COUNTRY_CREATED)
        } else {
          helper.error()
        }
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = () => {
    setVisible(true)
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="max-w-4xl mx-auto space-y-6 py-6" style={visible ? {} : { display: 'none' }}>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/countries')} className="w-9 h-9 rounded-lg border border-border flex items-center justify-center hover:bg-background transition-colors">
            <span className="text-text-secondary text-lg">&larr;</span>
          </button>
          <h1 className="text-2xl font-bold text-text">{strings.NEW_COUNTRY_HEADING}</h1>
        </div>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-xl border border-border p-6 space-y-5">
            <h2 className="text-base font-semibold text-text pb-4 border-b border-border">Country Names</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {fields.map((field, index) => (
                <FormControl key={field.id} fullWidth margin="dense">
                  <InputLabel className="required">{`${commonStrings.NAME} (${env._LANGUAGES[index].label})`}</InputLabel>
                  <Input
                    type="text"
                    error={!!errors.names?.[index]?.name}
                    required
                    {...register(`names.${index}.name`)}
                    autoComplete="off"
                  />
                  <FormHelperText error={!!errors.names?.[index]?.name}>
                    {errors.names?.[index]?.name?.message || ''}
                  </FormHelperText>
                </FormControl>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 pb-6">
            <Button
              variant="contained"
              className="btn-secondary !rounded-xl !normal-case !font-medium !px-6 !py-2.5 !shadow-none"
              size="small"
              onClick={() => navigate('/countries')}
            >
              {commonStrings.CANCEL}
            </Button>
            <Button type="submit" variant="contained" className="btn-primary !rounded-xl !normal-case !font-semibold !px-6 !py-2.5 !shadow-none" size="small" disabled={isSubmitting}>
              {commonStrings.CREATE}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default CreateCountry

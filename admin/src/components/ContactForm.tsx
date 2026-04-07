import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/contact-form'
import * as UserService from '@/services/UserService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ContactForm'

interface ContactFormProps {
  user?: bookcarsTypes.User
  className?: string
}

const ContactForm = ({ user, className }: ContactFormProps) => {
  const navigate = useNavigate()
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { register, setValue, handleSubmit, reset, formState: { errors, isSubmitting }, clearErrors } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  const initForm = useCallback((user?: bookcarsTypes.User) => {
    if (user) {
      setIsAuthenticated(true)
      setValue('email', user.email!)
    }
  }, [setValue])

  useEffect(() => {
    initForm(user)
  }, [initForm, user])


  const onSubmit = async (data: FormFields) => {
    try {
      let recaptchaToken = ''
      if (reCaptchaLoaded) {
        recaptchaToken = await generateReCaptchaToken()
        if (!(await helper.verifyReCaptcha(recaptchaToken))) {
          recaptchaToken = ''
        }
      }

      if (env.RECAPTCHA_ENABLED && !recaptchaToken) {
        helper.error('reCAPTCHA error')
        return
      }

      const payload: bookcarsTypes.SendEmailPayload = {
        from: data.email,
        to: env.CONTACT_EMAIL,
        subject: data.subject,
        message: data.message,
        isContactForm: true,
      }
      const status = await UserService.sendEmail(payload)

      if (status === 200) {
        reset()
        initForm(user)
        helper.info(strings.MESSAGE_SENT)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <div className={`${className ? `${className} ` : ''}bg-white rounded-2xl border border-border shadow-sm p-8 max-md:w-[350px] md:w-[550px]`}>
      <h1 className="text-center text-2xl font-bold text-text mb-6 capitalize">{strings.CONTACT_HEADING}</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        {!isAuthenticated && (
          <FormControl fullWidth margin="dense" error={!!errors.email}>
            <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
            <OutlinedInput
              type="text"
              {...register('email')}
              label={commonStrings.EMAIL}
              required
              autoComplete="off"
              onChange={() => {
                if (errors.email) {
                  clearErrors('email')
                }
              }}
            />
            <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
          </FormControl>
        )}

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.SUBJECT}</InputLabel>
          <OutlinedInput type="text" {...register('subject')} label={strings.SUBJECT} required autoComplete="off" />
        </FormControl>

        <FormControl fullWidth margin="dense">
          <InputLabel className="required">{strings.MESSAGE}</InputLabel>
          <OutlinedInput
            type="text"
            label={strings.MESSAGE}
            {...register('message')}
            autoComplete="off"
            required
            multiline
            minRows={7}
            maxRows={7}
          />
        </FormControl>

        <div className="flex items-center gap-3 mt-6">
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-10 px-6 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting
              ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : strings.SEND}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="h-10 px-6 border border-primary text-primary text-sm font-semibold rounded-xl hover:bg-primary/5 transition-colors"
          >
            {commonStrings.CANCEL}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ContactForm

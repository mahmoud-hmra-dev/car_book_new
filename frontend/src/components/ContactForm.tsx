import React, { useCallback, useEffect, useState } from 'react'
import {
  Paper,
  CircularProgress,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings } from '@/lang/contact-form'
import * as UserService from '@/services/UserService'
import { useRecaptchaContext, RecaptchaContextType } from '@/context/RecaptchaContext'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ContactForm'

import '@/assets/css/contact-form.css'

interface ContactFormProps {
  user?: bookcarsTypes.User
  className?: string
}

const ContactForm = ({ user, className }: ContactFormProps) => {
  const { reCaptchaLoaded, generateReCaptchaToken } = useRecaptchaContext() as RecaptchaContextType

  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { register, setValue, handleSubmit, reset, formState: { errors, isSubmitting }, clearErrors } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const initForm = useCallback((user?: bookcarsTypes.User) => {
    if (user) {
      setIsAuthenticated(true)
      setValue('email', user.email!)
      if (user.fullName) {
        setValue('fullName', user.fullName)
      }
      if (user.phone) {
        setValue('phone', user.phone)
      }
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
    <Paper className={`${className ? `${className} ` : ''}contact-form`} elevation={0}>
      <h2 className="contact-form-title">{strings.BOOK_YOUR_CAR}</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="contact-field-group">
          <div>
            <input
              type="text"
              className={`contact-input${errors.fullName ? ' contact-input-error' : ''}`}
              placeholder={strings.FULL_NAME}
              {...register('fullName')}
              autoComplete="name"
              onChange={() => {
                if (errors.fullName) {
                  clearErrors('fullName')
                }
              }}
            />
            {errors.fullName && (
              <div className="contact-field-error">{errors.fullName.message}</div>
            )}
          </div>

          {!isAuthenticated && (
            <div>
              <input
                type="email"
                className={`contact-input${errors.email ? ' contact-input-error' : ''}`}
                placeholder={strings.EMAIL}
                {...register('email')}
                autoComplete="email"
                onChange={() => {
                  if (errors.email) {
                    clearErrors('email')
                  }
                }}
              />
              {errors.email && (
                <div className="contact-field-error">{errors.email.message}</div>
              )}
            </div>
          )}

          <input
            type="tel"
            className="contact-input"
            placeholder={strings.PHONE_NUMBER}
            {...register('phone')}
            autoComplete="tel"
          />

          <input
            type="text"
            className="contact-input"
            placeholder={strings.SUBJECT}
            {...register('subject')}
            autoComplete="off"
          />

          <textarea
            className="contact-input contact-textarea"
            placeholder={strings.MESSAGE}
            {...register('message')}
            rows={5}
          />
        </div>

        <button
          type="submit"
          className="contact-submit-btn"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? <CircularProgress color="inherit" size={22} />
            : strings.BOOK_NOW}
        </button>
      </form>
    </Paper>
  )
}

export default ContactForm

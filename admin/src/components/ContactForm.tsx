import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  OutlinedInput,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
  Paper,
  CircularProgress,
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
      console.log('boo')
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
    <Paper className={`${className ? `${className} ` : ''}p-8 max-md:w-[350px] md:w-[550px] rounded-xl`} elevation={10}>
      <h1 className="text-center capitalize text-text text-2xl font-bold mb-4">{strings.CONTACT_HEADING}</h1>
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

        <div className="flex items-center gap-4 mt-6">
          <Button type="submit" variant="contained" className="bg-primary hover:bg-primary-dark text-white normal-case rounded-lg px-6 py-2" aria-label="Send" disabled={isSubmitting}>
            {
              isSubmitting
                ? <CircularProgress color="inherit" size={24} />
                : strings.SEND
            }
          </Button>
          <Button
            variant="outlined"
            color="primary"
            className="border-primary text-primary hover:bg-primary/5 normal-case rounded-lg px-6 py-2"
            aria-label="Cancel"
            onClick={() => {
              navigate('/')
            }}
          >
            {commonStrings.CANCEL}
          </Button>
        </div>
      </form>
    </Paper>
  )
}

export default ContactForm

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, InputLabel, FormControl, FormHelperText, Button, Paper } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/reset-password'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'
import { schema, FormFields } from '@/models/ForgotPasswordForm'

const ForgotPassword = () => {
  const navigate = useNavigate()

  const [visible, setVisible] = useState(false)
  const [sent, setSent] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  const onSubmit = async ({ email }: FormFields) => {
    try {
      const emailStatus = await UserService.validateEmail({ email, appType: env.APP_TYPE })
      if (emailStatus === 200) {
        // User not found, show error
        setError('email', { message: strings.EMAIL_ERROR })
        return
      }

      const status = await UserService.resend(email, true, env.APP_TYPE)
      if (status === 200) {
        setSent(true)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      <div className="flex flex-col items-center flex-1 my-11">
        <Paper className={`mt-10 w-[330px] md:w-[450px] p-[30px] ${visible ? '' : 'hidden'}`} elevation={10}>
          <h1 className="text-center mt-0">{strings.RESET_PASSWORD_HEADING}</h1>

          <div className={sent ? 'hidden' : ''}>
            <form onSubmit={handleSubmit(onSubmit)}>
              <FormControl fullWidth margin="dense">
                <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                <Input
                  {...register('email')}
                  onChange={() =>{
                    if (errors.email) {
                      clearErrors('email')
                    }
                  }}
                  type="text"
                  error={!!errors.email}
                  autoComplete="off"
                  required
                />
                <FormHelperText error={!!errors.email}>
                  {errors.email?.message || ''}
                </FormHelperText>
              </FormControl>

              <div className="buttons">
                <Button type="submit" className="btn-primary" variant="contained" disabled={isSubmitting}>
                  {strings.RESET}
                </Button>
                <Button variant="outlined" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </div>

          {sent && (
            <div>
              <span>{strings.EMAIL_SENT}</span>
              <p>
                <Button variant="text" onClick={() => navigate('/')} className="btn-lnk">
                  {commonStrings.GO_TO_HOME}
                </Button>
              </p>
            </div>
          )}
        </Paper>
      </div>
    </Layout>
  )
}

export default ForgotPassword

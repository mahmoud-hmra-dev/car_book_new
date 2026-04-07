import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input, InputLabel, FormControl, FormHelperText, Button } from '@mui/material'
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
      <div className={`min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4 ${visible ? '' : 'hidden'}`}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text">{strings.RESET_PASSWORD_HEADING}</h1>
            <p className="text-sm text-text-muted mt-2">Enter your email to reset your password</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
            <div className={sent ? 'hidden' : ''}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <FormControl fullWidth margin="dense">
                    <InputLabel>{commonStrings.EMAIL}</InputLabel>
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
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {strings.RESET}
                </button>

                <div className="flex justify-center">
                  <Button variant="outlined" onClick={() => navigate('/')}>
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            </div>

            {sent && (
              <div className="text-center space-y-4">
                <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-success text-2xl">&#10003;</span>
                </div>
                <span className="text-sm text-text-secondary block">{strings.EMAIL_SENT}</span>
                <p>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
                  >
                    {commonStrings.GO_TO_HOME}
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default ForgotPassword

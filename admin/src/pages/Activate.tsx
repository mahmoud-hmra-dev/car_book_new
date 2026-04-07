import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings as rpStrings } from '@/lang/reset-password'
import { strings as mStrings } from '@/lang/master'
import { strings } from '@/lang/activate'
import NoMatch from './NoMatch'
import * as helper from '@/utils/helper'
import { useUserContext, UserContextType } from '@/context/UserContext'
import Error from './Error'
import { schema, FormFields } from '@/models/ActivateForm'
import PasswordInput from '@/components/PasswordInput'

const Activate = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [visible, setVisible] = useState(false)
  const [resend, setResend] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [reset, setReset] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, setError, clearErrors } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const onSubmit = async ({ password }: FormFields) => {
    try {
      const data: bookcarsTypes.ActivatePayload = { userId, token, password }

      const status = await UserService.activate(data)
      if (status === 200) {
        const signInResult = await UserService.signin({ email, password })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setIsAuthenticated(true)
          setUser(user)
          setUserLoaded(true)

          const _status = await UserService.deleteTokens(userId)

          if (_status === 200) {
            navigate('/')
          } else {
            helper.error()
          }
        } else {
          helper.error()
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleResend = async () => {
    try {
      const status = await UserService.resend(email, false)

      if (status === 200) {
        helper.info(commonStrings.ACTIVATION_EMAIL_SENT)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    if (user) {
      setNoMatch(true)
    } else {
      const params = new URLSearchParams(window.location.search)
      if (params.has('u') && params.has('e') && params.has('t')) {
        const _userId = params.get('u')
        const _email = params.get('e')
        const _token = params.get('t')
        if (_userId && _email && _token) {
          try {
            const status = await UserService.checkToken(_userId, _email, _token)

            if (status === 200) {
              setUserId(_userId)
              setEmail(_email)
              setToken(_token)
              setVisible(true)

              if (params.has('r')) {
                const _reset = params.get('r') === 'true'
                setReset(_reset)
              }
            } else if (status === 204) {
              setEmail(_email)
              setResend(true)
            } else {
              setNoMatch(true)
            }
          } catch (err) {
            console.error(err)
            setError('root', {})
          }
        } else {
          setNoMatch(true)
        }
      } else {
        setNoMatch(true)
      }
    }
  }

  return (
    <Layout onLoad={onLoad} strict={false}>
      {resend && (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">{strings.ACTIVATE_HEADING}</h1>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8 text-center space-y-5">
              <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto">
                <span className="text-warning text-2xl">&#9888;</span>
              </div>
              <span className="text-sm text-text-secondary block">{strings.TOKEN_EXPIRED}</span>
              <button
                type="button"
                className="h-12 px-6 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
                onClick={handleResend}
              >
                {mStrings.RESEND}
              </button>
              <p className="flex justify-center">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
                >
                  {commonStrings.GO_TO_HOME}
                </button>
              </p>
            </div>
          </div>
        </div>
      )}
      {visible && (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">{reset ? rpStrings.RESET_PASSWORD_HEADING : strings.ACTIVATE_HEADING}</h1>
              <p className="text-sm text-text-muted mt-2">Set a password for your account</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div>
                  <PasswordInput
                    label={commonStrings.PASSWORD}
                    variant="standard"
                    {...register('password')}
                    error={!!errors.password}
                    helperText={errors.password?.message}
                    onChange={(e) => {
                      if (errors.password) {
                        clearErrors('password')
                      }
                      setValue('password', e.target.value)
                    }}
                    required
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <PasswordInput
                    label={commonStrings.CONFIRM_PASSWORD}
                    variant="standard"
                    {...register('confirmPassword')}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    onChange={(e) => {
                      if (errors.confirmPassword) {
                        clearErrors('confirmPassword')
                      }
                      setValue('confirmPassword', e.target.value)
                    }}
                    required
                    inputProps={{
                      autoComplete: 'new-password',
                      form: {
                        autoComplete: 'off',
                      },
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {reset ? commonStrings.UPDATE : strings.ACTIVATE}
                </button>

                <div className="flex justify-center">
                  <Button variant="outlined" color="primary" onClick={() => navigate('/')}>
                    {commonStrings.CANCEL}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {!isAuthenticated && noMatch && <NoMatch hideHeader />}

      {errors.root && <Error />}
    </Layout>
  )
}

export default Activate

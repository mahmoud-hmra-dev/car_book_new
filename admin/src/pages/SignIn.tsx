import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FormControl,
  InputLabel,
  Input,
  FormHelperText,
} from '@mui/material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-in'
import * as UserService from '@/services/UserService'
import Header from '@/components/Header'
import Error from '@/components/Error'
import * as langHelper from '@/utils/langHelper'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { schema, FormFields } from '@/models/SignInForm'
import PasswordInput from '@/components/PasswordInput'

const SignIn = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType
  const [visible, setVisible] = useState(false)

  const {
    register,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
    defaultValues: {
      stayConnected: false,
    },
  })

  const signinError = () => {
    setError('root', { message: strings.ERROR_IN_SIGN_IN })
  }

  const onSubmit = async ({ email, password, stayConnected }: FormFields) => {
    try {
      const data: bookcarsTypes.SignInPayload = {
        email,
        password,
        stayConnected: stayConnected,
      }

      const res = await UserService.signin(data)

      if (res.status === 200) {
        if (res.data.blacklisted) {
          await UserService.signout(false)
          setError('root', { message: strings.IS_BLACKLISTED })
        } else {
          const user = await UserService.getUser(res.data._id)
          setUser(user)
          setUserLoaded(true)

          const params = new URLSearchParams(window.location.search)

          if (params.has('u')) {
            navigate(`/user${window.location.search}`)
          } else if (params.has('c')) {
            navigate(`/supplier${window.location.search}`)
          } else if (params.has('cr')) {
            navigate(`/car${window.location.search}`)
          } else if (params.has('b')) {
            navigate(`/update-booking${window.location.search}`)
          } else {
            navigate('/')
          }
        }
      } else {
        signinError()
      }
    } catch {
      signinError()
    }
  }

  useEffect(() => {
    const init = async () => {
      try {
        langHelper.setLanguage(strings)

        const currentUser = UserService.getCurrentUser()

        if (currentUser) {
          const status = await UserService.validateAccessToken()

          if (status === 200) {
            const user = await UserService.getUser(currentUser._id)

            if (user) {
              navigate(`/${window.location.search}`)
            } else {
              await UserService.signout()
            }
          }
        } else {
          setVisible(true)
        }
      } catch {
        await UserService.signout()
      }
    }

    init()
  }, [navigate])

  return (
    <div>
      <Header />

      {visible && (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">{strings.SIGN_IN_HEADING}</h1>
              <p className="text-sm text-text-muted mt-2">Sign in to your admin account</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <FormControl fullWidth margin="dense" error={!!errors.email}>
                    <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                    <Input
                      {...register('email')}
                      onChange={(e) => {
                        if (errors.email) {
                          clearErrors('email')
                        }
                        // Without the next line, if the field is auto-filled by the browser, react-form does not know it
                        setValue('email', e.target.value)
                      }}
                      autoComplete="email"
                      required
                    />
                    <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
                  </FormControl>
                </div>

                <div>
                  <PasswordInput
                    label={commonStrings.PASSWORD}
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
                    autoComplete="password"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="stay-connected"
                    type="checkbox"
                    className="w-4 h-4 rounded border-border text-primary accent-primary"
                    onChange={(e) => {
                      setValue('stayConnected', e.currentTarget.checked)
                    }}
                  />
                  <label
                    htmlFor="stay-connected"
                    className="cursor-pointer text-sm text-text-secondary select-none"
                  >
                    {strings.STAY_CONNECTED}
                  </label>
                </div>

                <div>
                  <button
                    type="button"
                    onClick={() => navigate('/forgot-password')}
                    className="text-sm text-primary font-medium hover:text-primary-dark transition-colors"
                  >
                    {strings.RESET_PASSWORD}
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {strings.SIGN_IN}
                </button>

                <div className="min-h-[40px] pt-2 text-center">
                  {errors.root && <Error message={errors.root.message!} />}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SignIn

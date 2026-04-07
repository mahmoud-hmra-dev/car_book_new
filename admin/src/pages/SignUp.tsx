import React, { useState } from 'react'
import {
  Input,
  InputLabel,
  FormControl,
  FormHelperText,
  Button,
} from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/sign-up'
import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import Error from '@/components/Error'
import Backdrop from '@/components/SimpleBackdrop'
import { useUserContext, UserContextType } from '@/context/UserContext'
import { schema, FormFields } from '@/models/SignUpForm'
import PasswordInput from '@/components/PasswordInput'

const SignUp = () => {
  const navigate = useNavigate()

  const { setUser, setUserLoaded } = useUserContext() as UserContextType

  const [visible, setVisible] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, clearErrors, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })

  const onSubmit = async (data: FormFields) => {
    try {
      const emailStatus = await UserService.validateEmail({ email: data.email })
      if (emailStatus !== 200) {
        setError('email', { message: commonStrings.EMAIL_ALREADY_REGISTERED })
        return
      }

      const payload: bookcarsTypes.SignUpPayload = {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        language: UserService.getLanguage(),
      }

      const status = await UserService.signup(payload)

      if (status === 200) {
        const signInResult = await UserService.signin({
          email: data.email,
          password: data.password,
        })

        if (signInResult.status === 200) {
          const user = await UserService.getUser(signInResult.data._id)
          setUser(user)
          setUserLoaded(true)
          navigate(`/${window.location.search}`)
        }
      }
    } catch (err) {
      console.error(err)
      setError('root', { message: strings.SIGN_UP_ERROR })
    }
  }

  const onLoad = (user?: bookcarsTypes.User) => {
    if (user) {
      navigate('/')
    } else {
      setVisible(true)
    }
  }

  return (
    <Layout strict={false} onLoad={onLoad}>
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4" style={visible ? {} : { display: 'none' }}>
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text">{strings.SIGN_UP_HEADING}</h1>
            <p className="text-sm text-text-muted mt-2">Create your admin account</p>
          </div>
          <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <FormControl fullWidth margin="dense">
                  <InputLabel htmlFor="full-name">{commonStrings.FULL_NAME}</InputLabel>
                  <Input
                    type="text"
                    {...register('fullName')}
                    autoComplete="off"
                    onChange={(e) => {
                      setValue('fullName', e.target.value)
                    }}
                    required
                  />
                </FormControl>
              </div>
              <div>
                <FormControl fullWidth margin="dense">
                  <InputLabel htmlFor="email">{commonStrings.EMAIL}</InputLabel>
                  <Input
                    type="text"
                    {...register('email')}
                    autoComplete="off"
                    onChange={(e) => {
                      if (errors.email) {
                        clearErrors('email')
                      }
                      setValue('email', e.target.value)
                    }}
                    required
                  />
                  <FormHelperText error={!!errors.email}>{errors.email?.message || ''}</FormHelperText>
                </FormControl>
              </div>

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
                  inputProps={{
                    autoComplete: 'new-password',
                    form: {
                      autoComplete: 'off',
                    },
                  }}
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
                {strings.SIGN_UP}
              </button>

              <div className="flex justify-center">
                <Button variant="contained" className="btn-secondary" size="small" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>

              <div className="min-h-[40px] pt-2 text-center">
                {errors.root && <Error message={errors.root.message!} />}
              </div>
            </form>
          </div>
        </div>
      </div>
      {isSubmitting && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default SignUp

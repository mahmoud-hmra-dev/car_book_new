import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'


import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/change-password'
import * as UserService from '@/services/UserService'
import Backdrop from '@/components/SimpleBackdrop'
import * as helper from '@/utils/helper'
import { schema, FormFields } from '@/models/ChangePasswordForm'
import NoMatch from '@/pages/NoMatch'
import PasswordInput from '@/components/PasswordInput'

const ChangePassword = () => {
  const navigate = useNavigate()

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [userId, setUserId] = useState<string>()
  const [user, setUser] = useState<bookcarsTypes.User | null>()
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)
  const [strict, setStrict] = useState<boolean>(false)
  const [noMatch, setNoMatch] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, setValue, clearErrors, setError, reset } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit',
  })

  const error = () => {
    helper.error(null, strings.PASSWORD_UPDATE_ERROR)
  }

  const onSubmit = async ({ currentPassword, newPassword }: FormFields) => {
    try {
      if (!userId && !loggedUser) {
        return
      }

      const status = strict ? (await UserService.checkPassword(userId || loggedUser?._id as string, currentPassword!)) : 200

      if (status === 200) {
        const data: bookcarsTypes.ChangePasswordPayload = {
          _id: userId || loggedUser?._id as string,
          password: currentPassword || '',
          newPassword,
          strict,
        }

        const status = await UserService.changePassword(data)

        if (status === 200) {
          setStrict(
            (user?.type === bookcarsTypes.UserType.Admin && loggedUser?.type === bookcarsTypes.UserType.Admin)
            || (user?.type === bookcarsTypes.UserType.Supplier && loggedUser?.type === bookcarsTypes.UserType.Supplier)
          )
          reset()
          helper.info(strings.PASSWORD_UPDATE)
        } else {
          error()
        }
      } else {
        setError('currentPassword', { message: strings.CURRENT_PASSWORD_ERROR })
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser) {
      const params = new URLSearchParams(window.location.search)
      let _userId = _loggedUser?._id
      let __user: bookcarsTypes.User | null = null
      if (params.has('u')) {
        _userId = params.get('u') || undefined
        setUserId(_userId)
        __user = await UserService.getUser(_userId)
      } else {
        setUserId(_loggedUser._id)
        __user = _loggedUser
      }

      if (_loggedUser.type === bookcarsTypes.UserType.Supplier
        && (__user?.type === bookcarsTypes.UserType.Admin || (__user?.type === bookcarsTypes.UserType.Supplier && __user._id !== _loggedUser._id))
      ) {
        setNoMatch(true)
        setLoading(false)
        return
      }

      const status = await UserService.hasPassword(_userId!)
      const __hasPassword = status === 200
      setStrict(__hasPassword
        && (
          (__user?.type === bookcarsTypes.UserType.Admin && _loggedUser.type === bookcarsTypes.UserType.Admin)
          || (__user?.type === bookcarsTypes.UserType.Supplier && _loggedUser.type === bookcarsTypes.UserType.Supplier)
        )
      )
      setLoggedUser(_loggedUser)
      setUser(__user)
      setLoading(false)
      setVisible(true)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {!noMatch && (
        <div className="min-h-[calc(100vh-56px)] flex items-center justify-center bg-background px-4" style={visible ? {} : { display: 'none' }}>
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-text">{strings.CHANGE_PASSWORD_HEADING}</h1>
              <p className="text-sm text-text-muted mt-2">Update your account password</p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg border border-border p-8">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {strict && (
                  <div>
                    <PasswordInput
                      label={strings.CURRENT_PASSWORD}
                      variant="standard"
                      {...register('currentPassword')}
                      error={!!errors.currentPassword}
                      helperText={errors.currentPassword?.message}
                      onChange={(e) => {
                        if (errors.currentPassword) {
                          clearErrors('currentPassword')
                        }
                        setValue('currentPassword', e.target.value)
                      }}
                      required
                    />
                  </div>
                )}

                <div>
                  <PasswordInput
                    label={strings.NEW_PASSWORD}
                    variant="standard"
                    {...register('newPassword')}
                    error={!!errors.newPassword}
                    helperText={errors.newPassword?.message}
                    onChange={(e) => {
                      if (errors.newPassword) {
                        clearErrors('newPassword')
                      }
                      setValue('newPassword', e.target.value)
                    }}
                    required
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
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-primary text-white rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-50"
                >
                  {commonStrings.RESET_PASSWORD}
                </button>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="border border-border text-text-secondary px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-background transition-colors"
                  >
                    {commonStrings.CANCEL}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default ChangePassword

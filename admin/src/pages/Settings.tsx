import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Input,
  InputLabel,
  FormHelperText,
  FormControl,
  FormControlLabel,
  Switch,
  Button,
  CircularProgress,
  Alert,
  Collapse,
} from '@mui/material'
import {
  Science as SeedIcon,
  CheckCircle as CheckIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Layout from '@/components/Layout'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/settings'
import * as UserService from '@/services/UserService'
import * as BankDetailsService from '@/services/BankDetailsService'
import * as SettingService from '@/services/SettingService'
import * as SeedService from '@/services/SeedService'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import * as helper from '@/utils/helper'
import { useUserContext, UserContextType } from '@/context/UserContext'
import BankDetailsForm from '@/components/BankDetailsForm'
import { schema, FormFields } from '@/models/SettingsForm'
import SettingForm from '@/components/SettingForm'

const Settings = () => {
  const navigate = useNavigate()

  const { user, setUser } = useUserContext() as UserContextType

  const [admin, setAdmin] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [enableEmailNotifications, setEnableEmailNotifications] = useState(false)
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)
  const [settings, setSettings] = useState<bookcarsTypes.Setting | null>(null)
  const [seeding, setSeeding] = useState(false)
  const [seedResult, setSeedResult] = useState<{ success: boolean; log: string[]; message?: string } | null>(null)
  const [showSeedLog, setShowSeedLog] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting }, clearErrors, setValue } = useForm<FormFields>({
    resolver: zodResolver(schema),
    mode: 'onSubmit'
  })


  const handleEmailNotificationsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (user) {
        setEnableEmailNotifications(e.target.checked)

        const _user = bookcarsHelper.clone(user) as bookcarsTypes.User
        _user.enableEmailNotifications = e.target.checked

        const payload: bookcarsTypes.UpdateEmailNotificationsPayload = {
          _id: user._id as string,
          enableEmailNotifications: _user.enableEmailNotifications
        }
        const status = await UserService.updateEmailNotifications(payload)

        if (status === 200) {
          setUser(_user)
          helper.info(strings.SETTINGS_UPDATED)
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

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (avatar: string) => {
    const _user = bookcarsHelper.clone(user)
    _user.avatar = avatar
    setUser(_user)
    setLoading(false)
  }

  const onSubmit = async (data: FormFields) => {
    try {
      if (!user) {
        return
      }

      const payload: bookcarsTypes.UpdateUserPayload = {
        _id: user._id!,
        fullName: data.fullName,
        phone: data.phone || '',
        location: data.location || '',
        bio: data.bio || '',
      }

      const status = await UserService.updateUser(payload)

      if (status === 200) {
        helper.info(strings.SETTINGS_UPDATED)
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }


  const handleSeedLebanon = async () => {
    try {
      setSeeding(true)
      setSeedResult(null)
      const result = await SeedService.seedLebanon()
      setSeedResult(result)
      setShowSeedLog(true)
    } catch (err: any) {
      setSeedResult({ success: false, log: [], message: err?.response?.data?.message || err.message || 'Seed failed' })
    } finally {
      setSeeding(false)
    }
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    if (_user) {
      setUser(_user)
      setAdmin(helper.admin(_user))
      setValue('email', _user.email!)
      setValue('fullName', _user.fullName)
      setValue('phone', _user.phone || '')
      setValue('location', _user.location || '')
      setValue('bio', _user.bio || '')
      setEnableEmailNotifications(_user.enableEmailNotifications || false)

      const bankDetails = await BankDetailsService.getBankDetails()
      if (bankDetails) {
        setBankDetails(bankDetails)
      }

      const settings = await SettingService.getSettings()
      if (settings) {
        setSettings(settings)
      }

      setVisible(true)
      setLoading(false)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {visible && user && (
        <div className="max-w-3xl mx-auto py-8 px-4">

          <div className="bg-white rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-text mb-5">Profile Settings</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="flex justify-center mb-6">
                <Avatar
                  type={user.type}
                  mode="update"
                  record={user}
                  size="large"
                  readonly={false}
                  onBeforeUpload={onBeforeUpload}
                  onChange={onAvatarChange}
                  hideDelete={!admin}
                  color="disabled"
                  className="avatar-ctn"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.FULL_NAME}</InputLabel>
                  <Input {...register('fullName')} type="text" required autoComplete="off" />
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel className="required">{commonStrings.EMAIL}</InputLabel>
                  <Input {...register('email')} type="text" disabled />
                </FormControl>
                <FormControl fullWidth margin="dense" error={!!errors.phone}>
                  <InputLabel>{commonStrings.PHONE}</InputLabel>
                  <Input
                    {...register('phone')}
                    type="text"
                    autoComplete="off"
                    onChange={() => {
                      if (errors.phone) {
                        clearErrors('phone')
                      }
                    }}
                  />
                  <FormHelperText>{errors.phone?.message || ''}</FormHelperText>
                </FormControl>
                <FormControl fullWidth margin="dense">
                  <InputLabel>{commonStrings.LOCATION}</InputLabel>
                  <Input {...register('location')} type="text" autoComplete="off" />
                </FormControl>
              </div>
              <div className="mt-5">
                <FormControl fullWidth margin="dense">
                  <InputLabel>{commonStrings.BIO}</InputLabel>
                  <Input {...register('bio')} type="text" autoComplete="off" />
                </FormControl>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-border">
                <Button variant="contained" className="btn-primary" size="small" onClick={() => navigate('/change-password')}>
                  {commonStrings.RESET_PASSWORD}
                </Button>
                <Button type="submit" variant="contained" className="btn-primary" size="small" disabled={isSubmitting}>
                  {commonStrings.SAVE}
                </Button>
                <Button variant="contained" className="btn-secondary" size="small" onClick={() => navigate('/')}>
                  {commonStrings.CANCEL}
                </Button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-text mb-5">{strings.NETWORK_SETTINGS}</h2>
            <FormControl component="fieldset">
              <FormControlLabel
                control={(
                  <Switch
                    checked={enableEmailNotifications}
                    onChange={handleEmailNotificationsChange}
                  />
                )}
                label={strings.SETTINGS_EMAIL_NOTIFICATIONS}
              />
            </FormControl>
          </div>

          {user.type === bookcarsTypes.UserType.Admin && (
            <SettingForm
              settings={settings}
              onSubmit={(data) => setSettings(data)}
            />
          )}

          {user.type === bookcarsTypes.UserType.Admin && (
            <BankDetailsForm
              bankDetails={bankDetails}
              onSubmit={(data) => setBankDetails(data)}
            />
          )}

          {user.type === bookcarsTypes.UserType.Admin && (
            <div className="bg-white rounded-xl border border-border p-6 mb-6">
              <h2 className="text-lg font-semibold text-text mb-2 flex items-center gap-2">
                <SeedIcon color="success" />
                Demo Data
              </h2>
              <p className="text-sm text-text-secondary mb-4">
                Populate the database with 10 Lebanese car rental suppliers and 200 demo cars (20 per supplier).
                Safe to run multiple times — skips existing records.
              </p>

              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={seeding}
                startIcon={seeding ? <CircularProgress size={16} color="inherit" /> : <SeedIcon />}
                onClick={handleSeedLebanon}
                style={{ marginBottom: 16 }}
              >
                {seeding ? 'Seeding...' : 'Seed Lebanon Demo Data'}
              </Button>

              {seedResult && (
                <Alert
                  severity={seedResult.success ? 'success' : 'error'}
                  icon={seedResult.success ? <CheckIcon /> : undefined}
                  action={(
                    <Button
                      size="small"
                      color="inherit"
                      onClick={() => setShowSeedLog((v) => !v)}
                      endIcon={showSeedLog ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    >
                      Log
                    </Button>
                  )}
                >
                  {seedResult.success
                    ? seedResult.log[seedResult.log.length - 1] || 'Seed completed!'
                    : seedResult.message || 'Seed failed'}
                </Alert>
              )}

              {seedResult && (
                <Collapse in={showSeedLog}>
                  <div className="mt-2 p-3 bg-[#0f172a] rounded-lg max-h-[260px] overflow-y-auto font-mono text-xs text-text-muted leading-[1.7]">
                    {seedResult.log.map((line, i) => (
                      <div key={i} style={{ color: line.startsWith('\u2705') ? '#4ade80' : '#94a3b8' }}>
                        {line}
                      </div>
                    ))}
                    {seedResult.message && !seedResult.success && (
                      <div className="text-danger">{seedResult.message}</div>
                    )}
                  </div>
                </Collapse>
              )}
            </div>
          )}
        </div>
      )}

      {loading && <Backdrop text={commonStrings.PLEASE_WAIT} />}
    </Layout>
  )
}

export default Settings

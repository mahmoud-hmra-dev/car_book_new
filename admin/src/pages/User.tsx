import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material'
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings as ulStrings } from '@/lang/user-list'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import BookingList from '@/components/BookingList'
import NoMatch from './NoMatch'
import * as SupplierService from '@/services/SupplierService'

const User = () => {
  const navigate = useNavigate()

  const statuses = helper.getBookingStatuses().map((status) => status.value)

  const [loggedUser, setLoggedUser] = useState<bookcarsTypes.User>()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (visible) {
      const col1 = document.querySelector('.user-detail-sidebar')
      if (col1) {
        setOffset(col1.clientHeight)
      }
    }
  }, [visible])

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = () => {
    setLoading(false)
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    try {
      if (user) {
        setOpenDeleteDialog(false)

        const status = await UserService.deleteUsers([user._id as string])

        if (status === 200) {
          navigate('/users')
        } else {
          helper.error()
          setLoading(false)
        }
      } else {
        helper.error()
      }
    } catch (err) {
      helper.error(err)
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const onLoad = async (_loggedUser?: bookcarsTypes.User) => {
    if (_loggedUser && _loggedUser.verified) {
      setLoading(true)

      const params = new URLSearchParams(window.location.search)
      if (params.has('u')) {
        const id = params.get('u')
        if (id && id !== '') {
          try {
            const _user = await UserService.getUser(id)

            if (_user) {
              const setState = (_suppliers: string[]) => {
                setSuppliers(_suppliers)
                setLoggedUser(_loggedUser)
                setUser(_user)
                setVisible(true)
                setLoading(false)
              }

              const admin = helper.admin(_loggedUser)
              if (admin) {
                const _suppliers = await SupplierService.getAllSuppliers()
                const supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)
                setState(supplierIds)
              } else {
                setState([_loggedUser._id as string])
              }
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch (err) {
            helper.error(err)
            setLoading(false)
            setVisible(false)
          }
        } else {
          setLoading(false)
          setNoMatch(true)
        }
      } else {
        setLoading(false)
        setNoMatch(true)
      }
    }
  }

  const edit = loggedUser && user && (loggedUser.type === bookcarsTypes.RecordType.Admin || loggedUser._id === user._id || (loggedUser.type === bookcarsTypes.RecordType.Supplier && loggedUser._id === user.supplier))
  const supplier = user && user.type === bookcarsTypes.RecordType.Supplier

  let _suppliers: string[] = []
  if (loggedUser && user) {
    if ((supplier && loggedUser._id === user._id)
      || (loggedUser.type === bookcarsTypes.RecordType.Admin && user.type === bookcarsTypes.RecordType.Supplier)
    ) {
      _suppliers = [user._id as string]
    } else if (loggedUser.type === bookcarsTypes.RecordType.Supplier && user.type === bookcarsTypes.RecordType.User) {
      _suppliers = [loggedUser._id as string]
    } else if (loggedUser.type === bookcarsTypes.RecordType.Admin) {
      _suppliers = suppliers
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      {loggedUser && user && visible && (
        <div className="absolute bottom-0 right-0 left-0 top-0 overflow-auto">
          <div className="user-detail-sidebar max-md:pt-2.5 max-md:pb-4 max-md:bg-white max-md:border-b max-md:border-border md:absolute md:top-0 md:bottom-0 md:left-0 md:w-[300px] md:pt-5 md:bg-white md:border-r md:border-border">
            <section className="max-md:flex max-md:justify-center md:relative md:left-1/2 md:-translate-x-[30%]">
              <Avatar
                record={user}
                type={user.type}
                mode="update"
                size="large"
                hideDelete
                onBeforeUpload={onBeforeUpload}
                onChange={onAvatarChange}
                color="disabled"
                className={supplier ? 'rounded-xl overflow-hidden' : 'rounded-full overflow-hidden'}
                readonly
                verified
              />
            </section>
            <h2 className="text-center font-semibold mt-4 text-text text-2xl">
              {user.fullName}
            </h2>
            {user.bio && (
              <p className="text-center font-normal mt-2.5 text-text-secondary text-base">
                {user.bio}
              </p>
            )}
            {user.location && (
              <p className="text-center font-normal mt-2.5 text-text-secondary text-base">
                {user.location}
              </p>
            )}
            {user.phone && (
              <p className="text-center font-normal mt-2.5 text-text-secondary text-base">
                {user.phone}
              </p>
            )}
            {user.license && (
              <div className="flex flex-col p-1.5">
                <span className="text-text-secondary">{commonStrings.LICENSE}</span>
                <a href={bookcarsHelper.joinURL(env.CDN_LICENSES, user.license)} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {user.license}
                </a>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 mt-4">
              {edit && (
                <Tooltip title={commonStrings.UPDATE}>
                  <button
                    type="button"
                    onClick={() => navigate(`/update-user?u=${user._id}`)}
                    className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-background hover:-translate-y-0.5 transition-all text-text-secondary"
                  >
                    <EditIcon fontSize="small" />
                  </button>
                </Tooltip>
              )}
              {edit && (
                <Tooltip title={commonStrings.DELETE}>
                  <button
                    type="button"
                    data-id={user._id}
                    onClick={handleDelete}
                    className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-background hover:-translate-y-0.5 transition-all text-text-secondary"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>
          <div className="max-md:flex max-md:flex-col max-md:items-center md:absolute md:inset-[0_0_0_300px] md:overflow-auto">
            {_suppliers.length > 0 && (
              <BookingList
                containerClassName="user"
                offset={offset}
                loggedUser={loggedUser}
                user={supplier ? undefined : user}
                suppliers={_suppliers}
                statuses={statuses}
                hideDates={env.isMobile}
                checkboxSelection={!env.isMobile}
                hideSupplierColumn={supplier}
                language={loggedUser.language}
              />
            )}
          </div>
        </div>
      )}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="!font-semibold !text-text">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{ulStrings.DELETE_USER}</DialogContent>
        <DialogActions className="!p-4">
          <Button onClick={handleCancelDelete} variant="contained" className="!bg-border !text-text-secondary !rounded-xl !normal-case !shadow-none">
            {commonStrings.CANCEL}
          </Button>
          <Button onClick={handleConfirmDelete} variant="contained" className="!bg-danger !text-white !rounded-xl !normal-case !shadow-none">
            {commonStrings.DELETE}
          </Button>
        </DialogActions>
      </Dialog>
      {loading && <Backdrop text={commonStrings.LOADING} />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default User

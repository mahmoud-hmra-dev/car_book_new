import React, { useState } from 'react'
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
import { strings as clStrings } from '@/lang/supplier-list'
import * as SupplierService from '@/services/SupplierService'
import * as helper from '@/utils/helper'
import Layout from '@/components/Layout'
import Backdrop from '@/components/SimpleBackdrop'
import Avatar from '@/components/Avatar'
import CarList from '@/components/CarList'
import InfoBox from '@/components/InfoBox'
import Error from './Error'
import NoMatch from './NoMatch'

const Supplier = () => {
  const navigate = useNavigate()
  const [user, setUser] = useState<bookcarsTypes.User>()
  const [supplier, setSupplier] = useState<bookcarsTypes.User>()
  const [suppliers, setSuppliers] = useState<string[]>([])
  const [error, setError] = useState(false)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [noMatch, setNoMatch] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [rowCount, setRowCount] = useState(-1)
  const [language, setLanguage] = useState(env.DEFAULT_LANGUAGE)

  const onBeforeUpload = () => {
    setLoading(true)
  }

  const onAvatarChange = (avatar: string) => {
    if (user && supplier && user._id === supplier._id) {
      const _user = bookcarsHelper.clone(user)
      _user.avatar = avatar

      setUser(_user)
    }

    setLoading(false)
  }

  const handleDelete = () => {
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (supplier) {
      try {
        setOpenDeleteDialog(false)

        const status = await SupplierService.deleteSupplier(supplier._id as string)

        if (status === 200) {
          navigate('/suppliers')
        } else {
          helper.error()
        }
      } catch (err) {
        helper.error(err)
      }
    } else {
      helper.error()
    }
  }

  const handleCancelDelete = () => {
    setOpenDeleteDialog(false)
  }

  const handleCarListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Car> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCarDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = async (_user?: bookcarsTypes.User) => {
    setUser(_user)
    setLanguage(_user?.language as string)

    if (_user && _user.verified) {
      const params = new URLSearchParams(window.location.search)
      if (params.has('c')) {
        const id = params.get('c')
        if (id && id !== '') {
          try {
            const _supplier = await SupplierService.getSupplier(id)

            if (_supplier) {
              setSupplier(_supplier)
              setSuppliers([_supplier._id as string])
              setVisible(true)
              setLoading(false)
            } else {
              setLoading(false)
              setNoMatch(true)
            }
          } catch {
            setLoading(false)
            setError(true)
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

  const edit = user && supplier && (user.type === bookcarsTypes.RecordType.Admin || user._id === supplier._id)

  return (
    <Layout onLoad={onLoad} strict>
      {visible && supplier && suppliers && (
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/suppliers')}
              className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-background hover:-translate-y-0.5 transition-all text-text-secondary"
            >
              &larr;
            </button>
            <h1 className="text-2xl font-bold text-text">{supplier.fullName}</h1>
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-white shadow-sm flex items-center justify-center overflow-hidden">
                {edit ? (
                  <Avatar
                    record={supplier}
                    type={bookcarsTypes.RecordType.Supplier}
                    mode="update"
                    size="large"
                    hideDelete
                    onBeforeUpload={onBeforeUpload}
                    onChange={onAvatarChange}
                    readonly={!edit}
                    color="disabled"
                    className="rounded-xl overflow-hidden"
                  />
                ) : (
                  <img src={helper.supplierImageURL(supplier.avatar)} alt={supplier.fullName} className="w-full h-full object-cover" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-text">{supplier.fullName}</h2>
                {supplier.bio && (
                  helper.isValidURL(supplier.bio)
                    ? (
                      <a href={supplier.bio} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline mt-1 block break-words line-clamp-2">{supplier.bio}</a>
                    ) : (
                      <p className="text-sm text-text-secondary mt-1 break-words">{supplier.bio}</p>
                    )
                )}
              </div>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supplier.location && supplier.location !== '' && (
                <div>
                  <dt className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Location</dt>
                  <dd className="text-sm font-medium text-text mt-1">{supplier.location}</dd>
                </div>
              )}
              {supplier.phone && supplier.phone !== '' && (
                <div>
                  <dt className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Phone</dt>
                  <dd className="text-sm font-medium text-text mt-1">{supplier.phone}</dd>
                </div>
              )}
              {rowCount > 0 && (
                <div>
                  <dt className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Cars</dt>
                  <dd className="text-sm font-medium text-text mt-1">
                    <InfoBox value={`${rowCount} ${rowCount > 1 ? commonStrings.CARS : commonStrings.CAR}`} />
                  </dd>
                </div>
              )}
            </div>
            {edit && (
              <div className="flex items-center gap-3 px-6 pb-6">
                <Tooltip title={commonStrings.UPDATE}>
                  <button
                    type="button"
                    onClick={() => navigate(`/update-supplier?c=${supplier._id}`)}
                    className="flex items-center gap-2 bg-primary text-white h-10 px-5 rounded-xl font-semibold text-sm hover:bg-primary-dark shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5"
                  >
                    <EditIcon fontSize="small" />
                    {commonStrings.UPDATE}
                  </button>
                </Tooltip>
                <Tooltip title={commonStrings.DELETE}>
                  <button
                    type="button"
                    data-id={supplier._id}
                    onClick={handleDelete}
                    className="flex items-center gap-2 bg-danger text-white h-10 px-5 rounded-xl font-semibold text-sm hover:bg-red-600 transition-all hover:-translate-y-0.5"
                  >
                    <DeleteIcon fontSize="small" />
                    {commonStrings.DELETE}
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
          <div className="bg-white rounded-2xl border border-border shadow-sm p-6">
            <CarList
              user={user}
              suppliers={suppliers}
              keyword=""
              reload={false}
              language={language}
              onLoad={handleCarListLoad}
              onDelete={handleCarDelete}
              hideSupplier
            />
          </div>
        </div>
      )}
      <Dialog disableEscapeKeyDown maxWidth="xs" open={openDeleteDialog}>
        <DialogTitle className="!font-semibold !text-text">{commonStrings.CONFIRM_TITLE}</DialogTitle>
        <DialogContent>{clStrings.DELETE_SUPPLIER}</DialogContent>
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
      {error && <Error />}
      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default Supplier

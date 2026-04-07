import React, { useState } from 'react'
import { Upload as UploadIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'
import * as UserService from '@/services/UserService'
import * as helper from '@/utils/helper'
import env from '@/config/env.config'

interface DriverLicenseProps {
  user?: bookcarsTypes.User
  variant?: 'standard' | 'outlined'
  className?: string
  onUpload?: (filename: string) => void
  onDelete?: () => void
}

const DriverLicense = ({
  user,
  variant = 'standard',
  className,
  onUpload,
  onDelete,
}: DriverLicenseProps) => {
  const [license, setLicense] = useState(user?.license || null)

  const handleClick = async () => {
    const upload = document.getElementById('upload-license') as HTMLInputElement
    upload.value = ''
    setTimeout(() => {
      upload.click()
    }, 0)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      helper.error()
      return
    }

    const reader = new FileReader()
    const file = e.target.files[0]

    reader.onloadend = async () => {
      try {
        let filename: string | null = null
        if (user) {
          // upload new file
          const res = await UserService.updateLicense(user._id!, file)
          if (res.status === 200) {
            filename = res.data
          } else {
            helper.error()
          }
        } else {
          // Remove previous temp file
          if (license) {
            await UserService.deleteTempLicense(license)
          }
          // upload new file
          filename = await UserService.createLicense(file)
        }

        if (filename) {
          if (onUpload) {
            onUpload(filename)
          }
        }

        setLicense(filename)
      } catch (err) {
        helper.error(err)
      }
    }

    reader.readAsDataURL(file)
  }

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <input
        value={license || commonStrings.UPLOAD_DRIVER_LICENSE}
        readOnly
        onClick={handleClick}
        className={`w-full max-md:w-[210px] text-sm text-text-secondary cursor-pointer bg-white outline-none transition-all ${
          variant === 'outlined'
            ? 'h-11 px-4 rounded-xl border border-border focus:border-primary'
            : 'h-10 px-1 border-b border-border focus:border-primary'
        }`}
      />
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={handleClick}
          className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors"
        >
          <UploadIcon className="text-primary !w-5 !h-5" />
        </button>

        {license && (
          <>
            <button
              type="button"
              onClick={() => {
                const url = `${bookcarsHelper.trimEnd(user ? env.CDN_LICENSES : env.CDN_TEMP_LICENSES, '/')}/${license}`
                helper.downloadURI(url)
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-info/10 transition-colors"
            >
              <ViewIcon className="text-info !w-5 !h-5" />
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  let status = 0
                  if (user) {
                    status = await UserService.deleteLicense(user._id!)
                  } else {
                    status = await UserService.deleteTempLicense(license!)
                  }

                  if (status === 200) {
                    setLicense(null)

                    if (onDelete) {
                      onDelete()
                    }
                  } else {
                    helper.error()
                  }
                } catch (err) {
                  helper.error(err)
                }
              }}
              className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-danger/10 transition-colors"
            >
              <DeleteIcon className="text-danger !w-5 !h-5" />
            </button>
          </>
        )}
      </div>
      <input id="upload-license" type="file" hidden onChange={handleChange} />
    </div>
  )
}

export default DriverLicense

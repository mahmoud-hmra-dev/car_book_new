import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/suppliers'
import { strings as headerStrings } from '@/lang/header'
import Search from '@/components/Search'
import SupplierList from '@/components/SupplierList'
import * as helper from '@/utils/helper'

import '@/assets/css/suppliers.css'

const Suppliers = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleSupplierListLoad: bookcarsTypes.DataEvent<bookcarsTypes.User> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleSupplierDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    setUser(_user)
  }

  const admin = helper.admin(user)

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="suppliers">
          <div className="page-header">
            <div>
              <h1 className="page-title">
                {headerStrings.COMPANIES}
                {rowCount > 0 && (
                  <span className="page-count">
                    {`(${rowCount} ${rowCount > 1 ? strings.SUPPLIERS : strings.SUPPLIER})`}
                  </span>
                )}
              </h1>
            </div>
            {admin && (
              <Button
                type="submit"
                variant="contained"
                className="btn-primary new-supplier"
                size="small"
                onClick={() => navigate('/create-supplier')}
              >
                {strings.NEW_SUPPLIER}
              </Button>
            )}
          </div>
          <div className="col-1">
            <div className="col-1-container">
              <Search className="search" onSubmit={handleSearch} />
            </div>
          </div>
          <div className="col-2">
            <SupplierList
              user={user}
              keyword={keyword}
              onLoad={handleSupplierListLoad}
              onDelete={handleSupplierDelete}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Suppliers

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/countries'
import { strings as headerStrings } from '@/lang/header'
import Search from '@/components/Search'
import CountryList from '@/components/CountryList'

import '@/assets/css/countries.css'

const Countries = () => {
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleCountryListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Country> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleCountryDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="countries">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {headerStrings.COUNTRIES}
              {rowCount > 0 && (
                <span className="page-count">
                  {`(${rowCount} ${rowCount > 1 ? strings.COUNTRIES : strings.COUNTRY})`}
                </span>
              )}
            </h1>
          </div>
          {rowCount > -1 && (
            <Button variant="contained" className="btn-primary new-country" size="small" onClick={() => navigate('/create-country')}>
              {strings.NEW_COUNTRY}
            </Button>
          )}
        </div>
        <div className="col-1">
          <div className="col-1-container">
            <Search className="search" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="col-2">
          <CountryList
            keyword={keyword}
            onLoad={handleCountryListLoad}
            onDelete={handleCountryDelete}
          />
        </div>
      </div>
    </Layout>
  )
}

export default Countries

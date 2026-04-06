import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/locations'
import { strings as headerStrings } from '@/lang/header'
import Search from '@/components/Search'
import LocationList from '@/components/LocationList'

import '@/assets/css/locations.css'

const Locations = () => {
  const navigate = useNavigate()

  const [keyword, setKeyword] = useState('')
  const [rowCount, setRowCount] = useState(-1)

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const handleLocationListLoad: bookcarsTypes.DataEvent<bookcarsTypes.Location> = (data) => {
    if (data) {
      setRowCount(data.rowCount)
    }
  }

  const handleLocationDelete = (_rowCount: number) => {
    setRowCount(_rowCount)
  }

  const onLoad = () => { }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="locations">
        <div className="page-header">
          <div>
            <h1 className="page-title">
              {headerStrings.LOCATIONS}
              {rowCount > 0 && (
                <span className="page-count">
                  {`(${rowCount} ${rowCount > 1 ? strings.LOCATIONS : strings.LOCATION})`}
                </span>
              )}
            </h1>
          </div>
          {rowCount > -1 && (
            <Button variant="contained" className="btn-primary new-location" size="small" onClick={() => navigate('/create-location')}>
              {strings.NEW_LOCATION}
            </Button>
          )}
        </div>
        <div className="col-1">
          <div className="col-1-container">
            <Search className="search" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="col-2">
          <LocationList
            keyword={keyword}
            onLoad={handleLocationListLoad}
            onDelete={handleLocationDelete}
          />
        </div>
      </div>
    </Layout>
  )
}

export default Locations

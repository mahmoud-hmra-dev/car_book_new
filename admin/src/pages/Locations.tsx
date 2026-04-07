import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/locations'
import { strings as headerStrings } from '@/lang/header'
import Search from '@/components/Search'
import LocationList from '@/components/LocationList'

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
      <div className="flex flex-col gap-6 min-h-0">
        <div className="bg-white rounded-xl shadow-sm py-5 px-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text m-0 leading-snug">
              {headerStrings.LOCATIONS}
              {rowCount > 0 && (
                <span className="text-sm font-normal text-text-muted ml-3">
                  {`(${rowCount} ${rowCount > 1 ? strings.LOCATIONS : strings.LOCATION})`}
                </span>
              )}
            </h1>
          </div>
          {rowCount > -1 && (
            <Button variant="contained" className="btn-primary !rounded-lg !normal-case !font-semibold !text-sm !py-2 !px-5 !shadow-none" size="small" onClick={() => navigate('/create-location')}>
              {strings.NEW_LOCATION}
            </Button>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm py-5 px-6 w-full">
          <div className="flex flex-wrap gap-3 items-center w-full max-md:flex-col">
            <Search className="w-full max-w-[400px] flex justify-start max-md:max-w-full" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm py-4 px-6 min-h-[300px] flex flex-col items-center flex-1">
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

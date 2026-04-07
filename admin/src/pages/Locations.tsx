import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-text">
            {headerStrings.LOCATIONS}
            {rowCount > 0 && (
              <span className="text-sm font-normal text-text-muted ml-3">
                {`(${rowCount} ${rowCount > 1 ? strings.LOCATIONS : strings.LOCATION})`}
              </span>
            )}
          </h1>
          {rowCount > -1 && (
            <button
              type="button"
              className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors"
              onClick={() => navigate('/create-location')}
            >
              {strings.NEW_LOCATION}
            </button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <div className="flex flex-wrap items-end gap-4">
            <Search className="w-full max-w-[400px] flex justify-start max-md:max-w-full" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border shadow-sm p-5 min-h-[300px] flex flex-col items-center flex-1">
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

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import { strings } from '@/lang/countries'
import { strings as headerStrings } from '@/lang/header'
import Search from '@/components/Search'
import CountryList from '@/components/CountryList'

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-text">
            {headerStrings.COUNTRIES}
            {rowCount > 0 && (
              <span className="text-sm font-normal text-text-muted ml-3">
                {`(${rowCount} ${rowCount > 1 ? strings.COUNTRIES : strings.COUNTRY})`}
              </span>
            )}
          </h1>
          {rowCount > -1 && (
            <Button variant="contained" className="btn-primary !rounded-xl !normal-case !font-semibold !text-sm !py-2.5 !px-5 !shadow-none" size="small" onClick={() => navigate('/create-country')}>
              {strings.NEW_COUNTRY}
            </Button>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <div className="flex flex-wrap items-end gap-4">
            <Search className="w-full max-w-[400px] flex justify-start max-md:max-w-full" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 min-h-[300px] flex flex-col items-center flex-1">
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

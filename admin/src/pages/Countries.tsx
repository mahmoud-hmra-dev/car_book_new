import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text">
              {headerStrings.COUNTRIES}
              {rowCount > 0 && (
                <span className="text-sm font-normal text-text-muted ml-3">
                  {`(${rowCount} ${rowCount > 1 ? strings.COUNTRIES : strings.COUNTRY})`}
                </span>
              )}
            </h1>
            <p className="text-sm text-text-muted mt-1">Manage countries for your rental operations</p>
          </div>
          {rowCount > -1 && (
            <button
              type="button"
              className="flex items-center gap-2 bg-primary text-white h-11 px-6 rounded-xl font-semibold text-sm hover:bg-primary-dark shadow-sm shadow-primary/25 transition-all hover:-translate-y-0.5"
              onClick={() => navigate('/create-country')}
            >
              {strings.NEW_COUNTRY}
            </button>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5">
          <div className="flex flex-wrap items-end gap-4">
            <Search className="w-full max-w-[400px] flex justify-start max-md:max-w-full" onSubmit={handleSearch} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 min-h-[300px] flex flex-col items-center flex-1">
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

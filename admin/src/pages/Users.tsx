import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import Layout from '@/components/Layout'
import env from '@/config/env.config'
import { strings } from '@/lang/users'
import { strings as headerStrings } from '@/lang/header'
import * as helper from '@/utils/helper'
import UserTypeFilter from '@/components/UserTypeFilter'
import Search from '@/components/Search'
import UserList from '@/components/UserList'

const Users = () => {
  const navigate = useNavigate()

  const [user, setUser] = useState<bookcarsTypes.User>()
  const [admin, setAdmin] = useState(false)
  const [types, setTypes] = useState<bookcarsTypes.UserType[]>()
  const [keyword, setKeyword] = useState('')

  const handleUserTypeFilterChange = (newTypes: bookcarsTypes.UserType[]) => {
    setTypes(newTypes)
  }

  const handleSearch = (newKeyword: string) => {
    setKeyword(newKeyword)
  }

  const onLoad = (_user?: bookcarsTypes.User) => {
    const _admin = helper.admin(_user)
    const _types = _admin
      ? helper.getUserTypes().map((userType) => userType.value)
      : [bookcarsTypes.UserType.Supplier, bookcarsTypes.UserType.User]

    setUser(_user)
    setAdmin(_admin)
    setTypes(_types)
  }

  return (
    <Layout onLoad={onLoad} strict>
      {user && (
        <div className="flex flex-col gap-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm py-5 px-6 flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl font-bold text-text m-0 leading-snug">{headerStrings.USERS}</h1>
            <Button variant="contained" className="btn-primary !rounded-lg !normal-case !font-semibold !text-sm !py-2 !px-5 !shadow-none" size="small" onClick={() => navigate('/create-user')}>
              {strings.NEW_USER}
            </Button>
          </div>
          <div className="bg-white rounded-xl shadow-sm py-5 px-6 w-full">
            <div className="flex flex-wrap gap-3 items-center w-full max-md:flex-col">
              <Search onSubmit={handleSearch} className="w-full max-w-[400px] max-md:max-w-full" />

              {admin
                && (
                  <UserTypeFilter
                    className="bg-gray-100 border-border rounded-lg m-0 max-md:hidden"
                    onChange={handleUserTypeFilterChange}
                  />
                )}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm min-h-[300px] flex-1 overflow-hidden">
            <UserList
              user={user}
              types={types}
              keyword={keyword}
              checkboxSelection={!env.isMobile && admin}
              hideDesktopColumns={env.isMobile}
            />
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Users

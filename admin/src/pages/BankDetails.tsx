import React, { useState } from 'react'
import { FormControl, Input, InputLabel, Paper } from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import * as BankDetailsService from '@/services/BankDetailsService'
import { strings } from '@/lang/bank-details-form'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'

const BankDetails = () => {
  const [bankDetails, setBankDetails] = useState<bookcarsTypes.BankDetails | null>(null)
  const [noMatch, setNoMatch] = useState(false)

  const onLoad = async () => {
    try {
      const _bankDetails = await BankDetailsService.getBankDetails()
      setBankDetails(_bankDetails)
      if (!_bankDetails?.showBankDetailsPage) {
        setNoMatch(true)
      }
    } catch (err) {
      helper.error(err)
    }
  }

  return (
    <Layout onLoad={onLoad} strict>
      <div className="flex flex-col flex-1 justify-center items-center">

        {bankDetails && !noMatch && (
          <Paper className="w-[360px] md:w-[550px] my-[100px] p-[62px]" elevation={10}>
            <h1 className="text-center capitalize text-[#121212] -mt-[18px]">{strings.BANK_DETAILS}</h1>

            <FormControl fullWidth margin="dense">
              <InputLabel>{strings.ACCOUNT_HOLDER}</InputLabel>
              <Input type="text" readOnly autoComplete="off" value={bankDetails.accountHolder} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{strings.BANK_NAME}</InputLabel>
              <Input type="text" readOnly autoComplete="off" value={bankDetails.bankName} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{strings.IBAN}</InputLabel>
              <Input type="text" readOnly autoComplete="off" value={bankDetails.iban} />
            </FormControl>

            <FormControl fullWidth margin="dense">
              <InputLabel>{strings.SWIFT_BIC}</InputLabel>
              <Input type="text" readOnly autoComplete="off" value={bankDetails.swiftBic} />
            </FormControl>

          </Paper>
        )}
      </div>

      {noMatch && <NoMatch hideHeader />}
    </Layout>
  )
}

export default BankDetails
